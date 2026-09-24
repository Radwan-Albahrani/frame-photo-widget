import ExpoModulesCore
import UIKit

public final class FrameContextMenuModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FrameContextMenu")

    View(FrameContextMenuView.self) {
      Events("onPressAction", "onMenuStateChange", "onDropItems", "onSpringLoad")

      Prop("actions") { (view, actions: [[String: Any]]) in
        view.setActions(actions)
      }

      Prop("menuTitle") { (view, title: String?) in
        view.setMenuTitle(title ?? "")
      }

      // Rounds the long-press lift preview to match the card's corner radius.
      Prop("previewCornerRadius") { (view, radius: Double?) in
        view.previewCornerRadius = CGFloat(radius ?? 0)
      }

      // false (default) → long-press context menu with a lift preview; true → tap-to-open dropdown.
      Prop("tapToOpen") { (view, tap: Bool?) in
        view.setTapToOpen(tap ?? false)
      }

      // Holding then moving lifts the card into an in-app drag carrying this id and kind.
      Prop("dragItemId") { (view, id: String?) in
        view.setDragItemId(id)
      }

      Prop("dragItemKind") { (view, kind: FrameDragKind?) in
        view.dragItemKind = kind
      }

      // Accepts in-app drags made only of these kinds and not holding itself; drops report through onDropItems.
      Prop("dropAccepts") { (view, kinds: [FrameDragKind]?) in
        view.setDropAccepts(Set(kinds ?? []))
      }

      // Hovering a drag over the card fires onSpringLoad, the way Files opens a folder mid-drag.
      Prop("springLoads") { (view, on: Bool?) in
        view.setSpringLoads(on ?? false)
      }
    }

    View(FrameDropZoneView.self) {
      Events("onDropItems")

      Prop("ownedIds") { (view, ids: [String]?) in
        view.ownedIds = Set(ids ?? [])
      }
    }
  }
}

/// Plain UIKit container that owns a native menu — attached directly to the RN view, never hosting
/// RN views inside SwiftUI (so none of @expo/ui ContextMenu's frame/touch corruption, expo/expo#47706).
/// Long-press mode uses `UIContextMenuInteraction` (lift + anchored menu); tap mode floats a transparent
/// `UIButton` overlay (the same UIKit menu, `showsMenuAsPrimaryAction`). RN children render normally
/// underneath — the ExpoBlurView pattern — and stay non-interactive triggers.
final class FrameContextMenuView: ExpoView, UIContextMenuInteractionDelegate,
  UIDragInteractionDelegate, UIDropInteractionDelegate
{
  let onPressAction = EventDispatcher()
  let onMenuStateChange = EventDispatcher()
  let onDropItems = EventDispatcher()
  let onSpringLoad = EventDispatcher()
  // Visibility has one source: the card hides while it rides in a drag and after it was dropped somewhere
  // else (the reload then removes it). It uses `isHidden`, never alpha: Fabric rewrites layer.opacity from
  // props whenever it invalidates the layer (a trait change mid-drag is enough), which would show the card
  // again under its own drag preview.
  var isInDrag = false {
    didSet { updateVisibility() }
  }
  var wasDropped = false {
    didSet { updateVisibility() }
  }
  private var isDropHighlighted = false

  var dragItemKind: FrameDragKind?
  private var dropAccepts: Set<FrameDragKind> = []
  private var springInteraction: UISpringLoadedInteraction?
  private var dragItemId: String?
  private var dragInteraction: UIDragInteraction?
  private var dropInteraction: UIDropInteraction?
  private var dragImage: UIImage?

  private var actions: [[String: Any]] = []
  private var menuTitle: String = ""
  var previewCornerRadius: CGFloat = 0
  private var tapToOpen = false

  private var contextInteraction: UIContextMenuInteraction?
  private var tapButton: UIButton?

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    semanticContentAttribute = Self.reactLayoutDirection()
    installLongPress()
  }

  // MARK: - Props

  func setActions(_ next: [[String: Any]]) {
    actions = next
    tapButton?.menu = buildMenu()
  }

  func setMenuTitle(_ next: String) {
    menuTitle = next
    tapButton?.menu = buildMenu()
  }

  // RN switches direction in-app (I18nManager) without flipping UIKit's app-global direction, and Fabric
  // does not reliably propagate the semantic attribute to native leaf views. I18nManager persists its state
  // in UserDefaults, so the module resolves RN's effective direction itself; no JS cooperation needed.
  private static func reactLayoutDirection() -> UISemanticContentAttribute {
    let defaults = UserDefaults.standard
    if defaults.bool(forKey: "RCTI18nUtil_forceRTL") { return .forceRightToLeft }
    let allowRTL = defaults.object(forKey: "RCTI18nUtil_allowRTL") as? Bool ?? true
    return allowRTL ? .unspecified : .forceLeftToRight
  }

  func setTapToOpen(_ next: Bool) {
    guard next != tapToOpen else {
      return
    }
    tapToOpen = next
    if next {
      installTap()
    } else {
      installLongPress()
    }
  }

  func setDragItemId(_ next: String?) {
    dragItemId = next?.isEmpty == false ? next : nil
    if dragItemId == nil {
      if let dragInteraction {
        removeInteraction(dragInteraction)
        self.dragInteraction = nil
      }
      return
    }
    guard dragInteraction == nil else {
      return
    }
    let interaction = UIDragInteraction(delegate: self)
    interaction.isEnabled = true
    addInteraction(interaction)
    dragInteraction = interaction
  }

  func setSpringLoads(_ on: Bool) {
    guard on != (springInteraction != nil) else {
      return
    }
    if let springInteraction {
      removeInteraction(springInteraction)
      self.springInteraction = nil
      return
    }
    let behavior = FrameSpringLoadBehavior { [weak self] in self?.dragItemId }
    let interaction = UISpringLoadedInteraction(
      interactionBehavior: behavior, interactionEffect: nil
    ) { [weak self] _, _ in
      self?.onSpringLoad([:])
    }
    addInteraction(interaction)
    springInteraction = interaction
  }

  func setDropAccepts(_ next: Set<FrameDragKind>) {
    dropAccepts = next
    if next.isEmpty {
      if let dropInteraction {
        removeInteraction(dropInteraction)
        self.dropInteraction = nil
      }
      return
    }
    guard dropInteraction == nil else {
      return
    }
    let interaction = UIDropInteraction(delegate: self)
    addInteraction(interaction)
    dropInteraction = interaction
  }

  // MARK: - Trigger installation

  private func installLongPress() {
    if let tapButton {
      tapButton.removeFromSuperview()
      self.tapButton = nil
    }
    guard contextInteraction == nil else {
      return
    }
    let interaction = UIContextMenuInteraction(delegate: self)
    addInteraction(interaction)
    contextInteraction = interaction
  }

  // A hold must NEVER also fire the row's tap. cancelsTouchesInView is not enough on the new
  // architecture: Fabric routes touches through its own root gesture recognizer (RCTSurfaceTouchHandler),
  // which ignores view-level cancellation, so releasing after the menu opened still delivered onPress
  // (navigating away under the open menu). Cancel RN's in-flight recognition directly by toggling the
  // touch handler's isEnabled (UIKit cancels a disabled recognizer mid-flight and RN dispatches
  // touchCancel to JS). Same technique as react-native-ios-context-menu. Walks ancestors once per hold.
  private func cancelReactTouches() {
    var current: UIView? = self
    while let view = current {
      if let recognizers = view.gestureRecognizers {
        for recognizer in recognizers
        where NSStringFromClass(type(of: recognizer)).contains("TouchHandler") {
          recognizer.isEnabled = false
          recognizer.isEnabled = true
          return
        }
      }
      current = view.superview
    }
  }

  private func installTap() {
    if let contextInteraction {
      removeInteraction(contextInteraction)
      self.contextInteraction = nil
    }
    guard tapButton == nil else {
      return
    }
    let button = UIButton(type: .custom)
    button.semanticContentAttribute = Self.reactLayoutDirection()
    button.showsMenuAsPrimaryAction = true
    button.backgroundColor = .clear
    button.isAccessibilityElement = false
    button.menu = buildMenu()
    addSubview(button)
    tapButton = button
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    if let tapButton {
      tapButton.frame = bounds
      // RN mounts its children after ours, so keep the tap target on top every layout pass.
      bringSubviewToFront(tapButton)
    }
  }

  // MARK: - UIContextMenuInteractionDelegate (long-press)

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    configurationForMenuAtLocation location: CGPoint
  ) -> UIContextMenuConfiguration? {
    guard !actions.isEmpty else {
      return nil
    }
    // The hold has recognized: kill RN's in-flight touch NOW so releasing can never fire the row's tap.
    cancelReactTouches()
    dragImage = renderDragImage()
    return UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { [weak self] _ in
      self?.buildMenu()
    }
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    previewForHighlightingMenuWithConfiguration configuration: UIContextMenuConfiguration
  ) -> UITargetedPreview? {
    return targetedPreview()
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    previewForDismissingMenuWithConfiguration configuration: UIContextMenuConfiguration
  ) -> UITargetedPreview? {
    // The card can unmount or recycle while the menu is open (a delete removes it); UIKit hard-asserts
    // on a targeted preview whose view is detached, so fall back to the default fade instead.
    return targetedPreview()
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    willDisplayMenuFor configuration: UIContextMenuConfiguration,
    animator: UIContextMenuInteractionAnimating?
  ) {
    // JS suppresses the card's tap while the menu is up: a press slipping through mid-lift navigates
    // away, unmounts this view under the open menu, and the dismissal preview then hits a dead view.
    onMenuStateChange(["open": true])
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    willEndFor configuration: UIContextMenuConfiguration,
    animator: UIContextMenuInteractionAnimating?
  ) {
    onMenuStateChange(["open": false])
  }

  private func updateVisibility() {
    isHidden = isInDrag || wasDropped
  }

  // No willPerformPreviewActionForMenuWith: tapping the lifted preview just dismisses the menu
  // (performing the card's tap there navigated when the user only meant to close the menu).

  private func targetedPreview() -> UITargetedPreview? {
    // UITargetedPreview(view:) asserts (BUG_IN_CLIENT_OF_TARGETED_PREVIEW) if the view is not in a window.
    guard window != nil else { return nil }
    let params = UIPreviewParameters()
    if previewCornerRadius > 0 {
      params.visiblePath = UIBezierPath(roundedRect: bounds, cornerRadius: previewCornerRadius)
    }
    // Preview a SNAPSHOT, not `self`. Lifting the live view reparents this Fabric view (and its RN children) into
    // UIKit's preview portal; a re-render triggered by the chosen menu action (e.g. moving the album) then unmounts
    // a child from that reparented tree at an index Fabric doesn't expect, hard-asserting in debug ("unmount a view
    // which has a different index"). A snapshot leaves the live tree in place, so mount/unmount stays consistent.
    if let snapshot = snapshotView(afterScreenUpdates: false) {
      snapshot.frame = bounds
      let target = UIPreviewTarget(
        container: self, center: CGPoint(x: bounds.midX, y: bounds.midY))
      return UITargetedPreview(view: snapshot, parameters: params, target: target)
    }
    return UITargetedPreview(view: self, parameters: params)
  }

  // A drag previews a rendered IMAGE, not the menu's snapshotView. A snapshotView is a replicant that only draws in
  // its source window, so carried into the drag window it shows as an empty dark platter. The image is captured
  // when the hold is recognized, before UIKit lifts anything, and each drag item supplies it as its own preview.
  private func renderDragImage() -> UIImage? {
    guard window != nil, bounds.width > 0, bounds.height > 0 else { return nil }
    let format = UIGraphicsImageRendererFormat.preferred()
    format.opaque = false
    return UIGraphicsImageRenderer(bounds: bounds, format: format).image { _ in
      drawHierarchy(in: bounds, afterScreenUpdates: false)
    }
  }

  private func dragPreviewView() -> UIImageView? {
    guard let image = dragImage ?? renderDragImage() else { return nil }
    let imageView = UIImageView(image: image)
    imageView.frame = bounds
    return imageView
  }

  // MARK: - UIDragInteractionDelegate

  func dragInteraction(
    _ interaction: UIDragInteraction,
    itemsForBeginning session: UIDragSession
  ) -> [UIDragItem] {
    cancelReactTouches()
    return dragItems()
  }

  // A second finger tapping this card mid-drag adds it to the stack under the first, like the Home Screen.
  func dragInteraction(
    _ interaction: UIDragInteraction,
    itemsForAddingTo session: UIDragSession,
    withTouchAt point: CGPoint
  ) -> [UIDragItem] {
    guard let dragItemId, !FrameDragSession.ids.contains(dragItemId) else {
      return []
    }
    dragImage = renderDragImage()
    let items = dragItems()
    join(items)
    return items
  }

  private func join(_ items: [UIDragItem]) {
    for item in items {
      if let payload = item.localObject as? FrameDragPayload {
        FrameDragSession.join(payload, from: self)
      }
    }
  }

  func dragInteraction(
    _ interaction: UIDragInteraction,
    item: UIDragItem,
    willAnimateCancelWith animator: UIDragAnimating
  ) {
    guard let payload = item.localObject as? FrameDragPayload else { return }
    animator.addCompletion { _ in FrameDragSession.reveal(payload.id) }
  }

  private func dragItems() -> [UIDragItem] {
    guard let dragItemId, let dragItemKind else {
      return []
    }
    let item = UIDragItem(itemProvider: NSItemProvider())
    item.localObject = FrameDragPayload(id: dragItemId, kind: dragItemKind)
    item.previewProvider = { [weak self] in
      guard let self, let preview = self.dragPreviewView() else { return nil }
      return UIDragPreview(view: preview, parameters: self.dragPreviewParameters())
    }
    return [item]
  }

  private func dragPreviewParameters() -> UIDragPreviewParameters {
    let params = UIDragPreviewParameters()
    params.backgroundColor = .clear
    if previewCornerRadius > 0 {
      params.visiblePath = UIBezierPath(roundedRect: bounds, cornerRadius: previewCornerRadius)
    }
    return params
  }

  func dragInteraction(
    _ interaction: UIDragInteraction,
    previewForLifting item: UIDragItem,
    session: UIDragSession
  ) -> UITargetedDragPreview? {
    guard window != nil, let preview = dragPreviewView() else { return nil }
    let target = UIDragPreviewTarget(
      container: self, center: CGPoint(x: bounds.midX, y: bounds.midY))
    return UITargetedDragPreview(view: preview, parameters: dragPreviewParameters(), target: target)
  }

  func dragInteraction(
    _ interaction: UIDragInteraction,
    sessionIsRestrictedToDraggingApplication session: UIDragSession
  ) -> Bool {
    return true
  }

  func dragInteraction(_ interaction: UIDragInteraction, sessionWillBegin session: UIDragSession) {
    join(session.items)
  }

  func dragInteraction(
    _ interaction: UIDragInteraction,
    session: UIDragSession,
    didEndWith operation: UIDropOperation
  ) {
    FrameDragSession.end(moved: operation == .move)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil, !isInDrag {
      wasDropped = false
    }
  }

  // MARK: - UIDropInteractionDelegate

  private func accepts(_ session: UIDropSession) -> Bool {
    let payloads = FrameDragPayload.all(session)
    return !payloads.isEmpty
      && payloads.allSatisfy { $0.id != dragItemId && dropAccepts.contains($0.kind) }
  }

  func dropInteraction(_ interaction: UIDropInteraction, canHandle session: UIDropSession) -> Bool {
    return !FrameDragPayload.all(session).isEmpty
  }

  func dropInteraction(
    _ interaction: UIDropInteraction,
    sessionDidUpdate session: UIDropSession
  ) -> UIDropProposal {
    return UIDropProposal(operation: accepts(session) ? .move : .cancel)
  }

  func dropInteraction(_ interaction: UIDropInteraction, sessionDidEnter session: UIDropSession) {
    guard accepts(session) else {
      return
    }
    UISelectionFeedbackGenerator().selectionChanged()
    setDropHighlight(true)
  }

  func dropInteraction(_ interaction: UIDropInteraction, sessionDidExit session: UIDropSession) {
    setDropHighlight(false)
  }

  func dropInteraction(_ interaction: UIDropInteraction, sessionDidEnd session: UIDropSession) {
    setDropHighlight(false)
  }

  // The dropped card shrinks into this one, so it reads as going inside rather than vanishing in place.
  func dropInteraction(
    _ interaction: UIDropInteraction,
    previewForDropping item: UIDragItem,
    withDefault defaultPreview: UITargetedDragPreview
  ) -> UITargetedDragPreview? {
    let target = UIDragPreviewTarget(
      container: self, center: CGPoint(x: bounds.midX, y: bounds.midY * 0.8),
      transform: CGAffineTransform(scaleX: 0.25, y: 0.25))
    return defaultPreview.retargetedPreview(with: target)
  }

  func dropInteraction(_ interaction: UIDropInteraction, performDrop session: UIDropSession) {
    setDropHighlight(false)
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    onDropItems(["items": FrameDragPayload.all(session).map { $0.event }])
  }

  private func setDropHighlight(_ on: Bool) {
    guard on != isDropHighlighted else {
      return
    }
    isDropHighlighted = on
    UIView.animate(
      withDuration: 0.35, delay: 0, usingSpringWithDamping: 1, initialSpringVelocity: 0,
      options: [.beginFromCurrentState, .allowUserInteraction]
    ) {
      self.transform = on ? CGAffineTransform(scaleX: 1.06, y: 1.06) : .identity
    }
  }

  // MARK: - Menu building

  private func buildMenu() -> UIMenu {
    return UIMenu(title: menuTitle, children: actions.compactMap { buildElement($0) })
  }

  private func buildElement(_ dict: [String: Any]) -> UIMenuElement? {
    guard let title = dict["title"] as? String, (dict["hidden"] as? Bool) != true else {
      return nil
    }
    let id = dict["id"] as? String ?? title
    let image = Self.buildImage(dict)
    let destructive = (dict["destructive"] as? Bool) == true
    let disabled = (dict["disabled"] as? Bool) == true

    // A submenu: UIMenu itself cannot be disabled, so a disabled parent renders as a disabled action.
    if let subs = dict["subactions"] as? [[String: Any]], !subs.isEmpty, !disabled {
      var options: UIMenu.Options = []
      if (dict["displayInline"] as? Bool) == true {
        options.insert(.displayInline)
      }
      if destructive {
        options.insert(.destructive)
      }
      return UIMenu(
        title: title, image: image, options: options,
        children: subs.compactMap { buildElement($0) })
    }

    var attributes: UIMenuElement.Attributes = []
    if destructive {
      attributes.insert(.destructive)
    }
    if disabled {
      attributes.insert(.disabled)
    }
    let state: UIMenuElement.State =
      switch dict["state"] as? String {
      case "on": .on
      case "mixed": .mixed
      default: .off
      }
    return UIAction(title: title, image: image, attributes: attributes, state: state) {
      [weak self] _ in
      self?.onPressAction(["event": id])
    }
  }

  private static func buildImage(_ dict: [String: Any]) -> UIImage? {
    guard let name = dict["image"] as? String, var image = UIImage(systemName: name) else {
      return nil
    }
    // imageColor arrives as an ARGB number (JS processColor); tint with original rendering so UIMenu keeps it.
    if let argb = dict["imageColor"] as? Double {
      let value = UInt32(bitPattern: Int32(truncatingIfNeeded: Int(argb)))
      let color = UIColor(
        red: CGFloat((value >> 16) & 0xff) / 255,
        green: CGFloat((value >> 8) & 0xff) / 255,
        blue: CGFloat(value & 0xff) / 255,
        alpha: CGFloat((value >> 24) & 0xff) / 255
      )
      image = image.withTintColor(color, renderingMode: .alwaysOriginal)
    }
    return image
  }
}
