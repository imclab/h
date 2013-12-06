$ = Annotator.$

class Annotator.Guest extends Annotator
  # Events to be bound on Annotator#element.
  events:
    ".annotator-adder button click":     "onAdderClick"
    ".annotator-adder button mousedown": "onAdderMousedown"
    "setTool": "onSetTool"
    "setVisibleHighlights": "onSetVisibleHighlights"

  # Plugin configuration
  options:
    TextHighlights: {}
    DomTextMapper:
      options:
        getIgnoredParts: -> $.makeArray $ [
          "div.annotator-notice",
          "div.annotator-frame"
          "div.annotator-adder"
        ].join ", "
        filterAttributeChanges: (node, attributeName, oldValue, newValue) ->
          if attributeName is "style"
            # This is a style change. We can't automatically
            # refuse to listen, because even still changes
            # can influence the string rendering, for example if
            # display is modified
            classStr = node.getAttribute "class"
            classes = if classStr then classStr.split " " else []

            # When setting the style of these classes, we don't case
            for c in [
              "annotorious-hint-msg"
              "annotorious-popup-buttons"
              "annotorious-item"
            ]
              return false if c in classes

            # Annotorious likes to mess with the body's selection
            # settings, which is bad for out sanity.
            # It can actually broke d-t-m mapping,
            # because in this selection mode, we can't use the
            # browser's selection API at all.
            #
            # So we pretend that we did not hear anything...
            if node.tagName.toLowerCase() is "body"
              if newValue is "-webkit-user-select: none;" or
                  oldValue is "-webkit-user-select: none;"
                return false

              console.log "Setting body style from ",
                "'" + oldValue + "'",
                "to",
                "'" + newValue + "'",
                "."

          unless attributeName is "class"
            #console.log "attr change:", attributeName, oldValue, newValue
            #console.log "classes:", classes
            return true
          newClasses = if newValue then newValue.split " " else []
          oldClasses = if oldValue then oldValue.split " " else []
          addedClasses = (c for c in newClasses when c not in oldClasses)
          removedClasses = (c for c in oldClasses when c not in newClasses)
          changedClasses = addedClasses.concat removedClasses
          for change in changedClasses
            unless change in [
              'annotator-hl-active'
              'annotator-hl-temporary'
              'annotator-highlights-always-on'
              'annotorious-item-focus'
              'annotorious-item-unfocus'
            ]
              #console.log "Real class change", change
              return true
          # We did not see any attr change that could cause real changes.
          false
    TextAnchors: {}
    FuzzyTextAnchors: {}
    PDF: {}
    ImageAnchors: {}
    Document: {}

  # Internal state
  comments: null
  tool: 'comment'
  visibleHighlights: false
  noBack: false

  constructor: (element, options) ->
    Gettext.prototype.parse_locale_data annotator_locale_data

    super

    # Create an array for holding the comments
    @comments = []

    @frame = $('<div></div>')
    .appendTo(@wrapper)
    .addClass('annotator-frame annotator-outer annotator-collapsed')

    delete @options.app

    this.addPlugin 'Bridge',
      formatter: (annotation) =>
        formatted = {}
        if annotation.document?
          formatted['uri'] = @plugins.Document.uri()
        for k, v of annotation when k isnt 'anchors'
          formatted[k] = v
        # Work around issue in jschannel where a repeated object is considered
        # recursive, even if it is not its own ancestor.
        if formatted.document?.title
          formatted.document.title = formatted.document.title.slice()
        formatted
      onConnect: (source, origin, scope) =>
        this.publish "enableAnnotating", @canAnnotate
        @panel = this._setupXDM
          window: source
          origin: origin
          scope: "#{scope}:provider"
          onReady: =>
            console.log "Guest functions are ready for #{origin}"
            setTimeout =>
              event = document.createEvent "UIEvents"
              event.initUIEvent "annotatorReady", false, false, window, 0
              event.annotator = this
              window.dispatchEvent event

    # Load plugins
    for own name, opts of @options
      if not @plugins[name]
        this.addPlugin(name, opts)

    # Watch for deleted comments
    this.subscribe 'annotationDeleted', (annotation) =>
      if this.isComment annotation
        i = @comments.indexOf annotation
        if i isnt -1
          @comments[i..i] = []
          @plugins.Heatmap._update()

    # Choose a document access policy.
    #
    # This would be done automatically when the annotations
    # are loaded, but we need it sooner, so that the heatmap
    # can work properly.
    this._chooseAccessPolicy()

  _setupXDM: (options) ->
    # jschannel chokes FF and Chrome extension origins.
    if (options.origin.match /^chrome-extension:\/\//) or
        (options.origin.match /^resource:\/\//)
      options.origin = '*'

    channel = Channel.build options

    channel

    .bind('onEditorHide', this.onEditorHide)
    .bind('onEditorSubmit', this.onEditorSubmit)

    .bind('setDynamicBucketMode', (ctx, value) =>
      return unless @plugins.Heatmap
      @plugins.Heatmap.dynamicBucket = value
      if value then @plugins.Heatmap._update()
    )

    .bind('setActiveHighlights', (ctx, tags=[]) =>
      for hl in @getHighlights()
        if hl.annotation.$$tag in tags
          hl.setActive true, true
        else
          unless hl.isTemporary()
            hl.setActive false, true
      this.publish "finalizeHighlights"
    )

    .bind('scrollTo', (ctx, tag) =>
      for hl in @getHighlights()
        if hl.annotation.$$tag is tag
          hl.scrollTo()
          return
    )

    .bind('adderClick', =>
      @selectedTargets = @forcedLoginTargets
      @onAdderClick @forcedLoginEvent
      delete @forcedLoginTargets
      delete @forcedLoginEvent
    )

    .bind('getDocumentInfo', =>
      return {
        uri: @plugins.Document.uri()
        metadata: @plugins.Document.metadata
      }
    )

    .bind('setTool', (ctx, name) =>
      this.setTool name
      this.publish 'setTool', name
    )

    .bind('setVisibleHighlights', (ctx, state) =>
      this.setVisibleHighlights state, false
      this.publish 'setVisibleHighlights', state
    )

  _setupWrapper: ->
    @wrapper = @element
    .on 'click', =>
      if @canAnnotate and not @noBack and not @creatingHL
        setTimeout =>
          unless @selectedTargets?.length
            @hideFrame()
      delete @creatingHL
    this

  # These methods aren't used in the iframe-hosted configuration of Annotator.
  _setupViewer: -> this
  _setupEditor: -> this

  showViewer: (annotations) =>
    @panel?.notify method: "showViewer", params: (a.id for a in annotations)

  updateViewer: (annotations) =>
    @panel?.notify method: "updateViewer", params: (a.id for a in annotations)

  showEditor: (annotation) => @plugins.Bridge.showEditor annotation

  addEmphasis: (annotations) =>
    @panel?.notify
      method: "addEmphasis"
      params: (a.id for a in annotations)

  removeEmphasis: (annotations) =>
    @panel?.notify
      method: "removeEmphasis"
      params: (a.id for a in annotations)

  checkForStartSelection: (event) =>
    # Override to prevent Annotator choking when this ties to access the
    # viewer but preserve the manipulation of the attribute `mouseIsDown` which
    # is needed for preventing the panel from closing while annotating.
    unless event and this.isAnnotator(event.target)
      @mouseIsDown = true

  confirmSelection: ->
    return true unless @selectedTargets.length is 1

    if @selectedTargets[0].selector?[0].type is 'ShapeSelector' then return true

    quote = @plugins.TextAnchors.getQuoteForTarget @selectedTargets[0]

    if quote.length > 2 then return true

    return confirm "You have selected a very short piece of text: only " + length + " chars. Are you sure you want to highlight this?"

  onSuccessfulSelection: (event, immediate) ->
    # Store the selected targets
    @selectedTargets = event.targets
    if @tool is 'highlight'

      # Are we allowed to create annotations? Return false if we can't.
      unless @canAnnotate
        #@Annotator.showNotification "You are already editing an annotation!",
        #  @Annotator.Notification.INFO
        return false

      # Do we really want to make this selection?
      return false unless this.confirmSelection()

      # Add a flag about what's happening
      @creatingHL = true

      # Create the annotation right away

      # Don't use the default method to create an annotation,
      # because we don't want to publish the beforeAnnotationCreated event
      # just yet.
      #
      # annotation = this.createAnnotation()
      #
      # Create an empty annotation manually instead
      annotation = {inject: true}

      annotation = this.setupAnnotation annotation

      # Notify listeners
      this.publish 'beforeAnnotationCreated', annotation
      this.publish 'annotationCreated', annotation
    else
      super

  onAnchorMouseover: (annotations) ->
    if (@tool is 'highlight') or @visibleHighlights
      this.addEmphasis annotations

  onAnchorMouseout: (annotations) ->
    if (@tool is 'highlight') or @visibleHighlights
      this.removeEmphasis annotations

  # When clicking on a highlight in highlighting mode,
  # set @noBack to true to prevent the sidebar from closing
  onAnchorMousedown: (annotations, highlightType) =>
    if highlightType is 'ImageHighlight' then @noBack = true
    else
      if (@tool is 'highlight') or @visibleHighlights then @noBack = true

  # When clicking on a highlight in highlighting mode,
  # tell the sidebar to bring up the viewer for the relevant annotations
  onAnchorClick: (annotations, highlightType) =>
    if highlightType isnt 'ImageHighlight'
      return unless (@tool is 'highlight') or @visibleHighlights and @noBack

    # Tell sidebar to show the viewer for these annotations
    this.showViewer annotations

    # We have already prevented closing the sidebar, now reset this flag
    @noBack = false

  setTool: (name) ->
    @tool = name
    @panel?.notify
      method: 'setTool'
      params: name

  setVisibleHighlights: (state=true, notify=true) ->
    if notify
      @panel?.notify
        method: 'setVisibleHighlights'
        params: state
    else
      markerClass = 'annotator-highlights-always-on'
      if state or this.tool is 'highlight'
        @element.addClass markerClass
      else
        @element.removeClass markerClass

  addComment: ->
    sel = @selectedTargets   # Save the selection
    # Nuke the selection, since we won't be using that.
    # We will attach this to the end of the document.
    # Our override for setupAnnotation will add that highlight.
    @selectedTargets = []
    this.onAdderClick()     # Open editor (with 0 targets)
    @selectedTargets = sel # restore the selection

  # Is this annotation a comment?
  isComment: (annotation) ->
    # No targets and no references means that this is a comment.    
    not (annotation.inject or annotation.references?.length or annotation.target?.length)

  # Override for setupAnnotation, to handle comments
  setupAnnotation: (annotation) ->
    promise = super # Set up annotation as usual
    promise.then (annotation) =>
      if this.isComment annotation
        @comments.push annotation
    promise

  # Open the sidebar
  showFrame: ->
    @panel?.notify method: 'open'

  # Close the sidebar
  hideFrame: ->
    @panel?.notify method: 'back'

  addToken: (token) =>
    @api.notify
      method: 'addToken'
      params: token

  onAdderClick: (event) =>
    """
    Differs from upstream in a few ways:
    - Don't fire annotationCreated events: that's the job of the sidebar
    - Save the event for retriggering if login interrupts the flow
    """
    event?.preventDefault?()

    # Save the event and targets for restarting edit on forced login
    @forcedLoginEvent = event
    @forcedLoginTargets = @selectedTargets

    # Hide the adder
    @adder.hide()
    @inAdderClick = false
    position = @adder.position()

    # Show a temporary highlight so the user can see what they selected
    # Also extract the quotation and serialize the ranges
    this.setupAnnotation(this.createAnnotation()).then (annotation) =>

      hl.setTemporary(true) for hl in @getHighlights([annotation])

      # Subscribe to the editor events

      # Make the highlights permanent if the annotation is saved
      save = =>
        do cleanup
        hl.setTemporary false for hl in @getHighlights [annotation]

      # Remove the highlights if the edit is cancelled
      cancel = =>
        do cleanup
        this.deleteAnnotation(annotation)

      # Don't leak handlers at the end
      cleanup = =>
        this.unsubscribe('annotationEditorHidden', cancel)
        this.unsubscribe('annotationEditorSubmit', save)

      this.subscribe('annotationEditorHidden', cancel)
      this.subscribe('annotationEditorSubmit', save)

      # Display the editor.
      this.showEditor(annotation, position)

  onSetTool: (name) ->
    switch name
      when 'comment'
        this.setVisibleHighlights this.visibleHighlights, false
      when 'highlight'
        this.setVisibleHighlights true, false

  onSetVisibleHighlights: (state) =>
    this.visibleHighlights = state
    this.setVisibleHighlights state, false

  # TODO: Workaround for double annotation deletion.
  # The short story: hiding the editor sometimes triggers
  # a spurious annotation delete.
  # Uncomment the traces below to investigate this further.
  deleteAnnotation: (annotation) ->
    if annotation.deleted
      return
    else
      annotation.deleted = true
    super
