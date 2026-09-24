import ExpoModulesCore
import UIKit

/// What a dragged card is. Mirrors `DragKind` in src/ui/menu/types.ts.
enum FrameDragKind: String, Enumerable {
  case album
  case group
}

/// One dragged card. It rides on `UIDragItem.localObject`, so it never leaves the app and needs no
/// item provider data.
final class FrameDragPayload: NSObject {
  let id: String
  let kind: FrameDragKind

  init(id: String, kind: FrameDragKind) {
    self.id = id
    self.kind = kind
  }

  var event: [String: String] {
    return ["id": id, "kind": kind.rawValue]
  }

  static func all(_ session: UIDropSession) -> [FrameDragPayload] {
    return (session.localDragSession?.items ?? []).compactMap { $0.localObject as? FrameDragPayload }
  }
}

/// The drag in flight. A second finger can tap more cards into it (Home Screen style), and every card
/// that joins hides while it is in the stack. UISpringLoadedInteractionContext does not expose the
/// session, so spring-loaded targets read the dragged ids from here.
enum FrameDragSession {
  private static var sources: [String: WeakCard] = [:]

  static var ids: Set<String> {
    return Set(sources.keys)
  }

  static var isActive: Bool {
    return !sources.isEmpty
  }

  static func join(_ payload: FrameDragPayload, from card: FrameContextMenuView) {
    sources[payload.id] = WeakCard(card)
    card.isInDrag = true
  }

  /// A cancelled card reappears the moment its preview lands back on it, not when the session ends.
  static func reveal(_ id: String) {
    guard let card = sources[id]?.card else { return }
    card.isInDrag = false
  }

  /// A card that moved stays hidden until the reload removes it, so it never flashes back in place.
  static func end(moved: Bool) {
    for source in sources.values {
      guard let card = source.card else { continue }
      card.wasDropped = moved
      card.isInDrag = false
    }
    sources = [:]
  }

  private final class WeakCard {
    weak var card: FrameContextMenuView?

    init(_ card: FrameContextMenuView) {
      self.card = card
    }
  }
}

/// Opens a folder the drag hovers over, unless that folder is part of the drag.
final class FrameSpringLoadBehavior: NSObject, UISpringLoadedInteractionBehavior {
  private let folderId: () -> String?

  init(folderId: @escaping () -> String?) {
    self.folderId = folderId
  }

  func shouldAllow(
    _ interaction: UISpringLoadedInteraction,
    with context: UISpringLoadedInteractionContext
  ) -> Bool {
    guard FrameDragSession.isActive, let folderId = folderId() else { return false }
    return !FrameDragSession.ids.contains(folderId)
  }
}

/// Hovering a drag near Back pops a level, the way Files does. UINavigationBar has no isSpringLoaded,
/// and the Back capsule is small, so the target is a generous band instead: the leading half of the
/// screen, from the top edge (status bar included) to `slop` below the bar. The same rule sits on the
/// bar and on every screen's drop zone, so whichever view is under the finger answers it.
final class FrameBackSpringLoad: NSObject, UISpringLoadedInteractionBehavior {
  private static let slop: CGFloat = 44

  private weak var navigation: UINavigationController?

  private init(navigation: UINavigationController) {
    self.navigation = navigation
  }

  static func interaction(for navigation: UINavigationController) -> UISpringLoadedInteraction {
    return UISpringLoadedInteraction(
      interactionBehavior: FrameBackSpringLoad(navigation: navigation), interactionEffect: nil
    ) { [weak navigation] _, _ in
      navigation?.popViewController(animated: true)
    }
  }

  static func install(on navigation: UINavigationController) {
    let bar = navigation.navigationBar
    guard !bar.interactions.contains(where: { $0 is UISpringLoadedInteraction }) else { return }
    bar.addInteraction(interaction(for: navigation))
    FrameBarDropForwarder.install(on: navigation)
  }

  func shouldAllow(
    _ interaction: UISpringLoadedInteraction,
    with context: UISpringLoadedInteractionContext
  ) -> Bool {
    guard FrameDragSession.isActive, let navigation, navigation.viewControllers.count > 1,
      let window = navigation.view.window
    else { return false }
    let bar = navigation.navigationBar
    let barBottom = bar.convert(CGPoint(x: 0, y: bar.bounds.maxY), to: window).y
    let point = context.location(in: window)
    let leading =
      window.effectiveUserInterfaceLayoutDirection == .rightToLeft
      ? point.x > window.bounds.midX : point.x < window.bounds.midX
    return leading && point.y <= barBottom + Self.slop
  }
}

/// Releasing over the navigation bar or large title drops into the screen being shown, so a drag that
/// just popped a level can land without first moving down into the grid.
final class FrameBarDropForwarder: NSObject, UIDropInteractionDelegate {
  private static var key: UInt8 = 0

  private weak var navigation: UINavigationController?

  private init(navigation: UINavigationController) {
    self.navigation = navigation
  }

  static func install(on navigation: UINavigationController) {
    let forwarder = FrameBarDropForwarder(navigation: navigation)
    let bar = navigation.navigationBar
    objc_setAssociatedObject(bar, &key, forwarder, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    bar.addInteraction(UIDropInteraction(delegate: forwarder))
  }

  private var visibleZone: FrameDropZoneView? {
    guard let root = navigation?.topViewController?.view else { return nil }
    var pending: [UIView] = [root]
    while !pending.isEmpty {
      let view = pending.removeFirst()
      if let zone = view as? FrameDropZoneView { return zone }
      pending.append(contentsOf: view.subviews)
    }
    return nil
  }

  func dropInteraction(_ interaction: UIDropInteraction, canHandle session: UIDropSession) -> Bool {
    return visibleZone?.dropInteraction(interaction, canHandle: session) ?? false
  }

  func dropInteraction(
    _ interaction: UIDropInteraction,
    sessionDidUpdate session: UIDropSession
  ) -> UIDropProposal {
    return visibleZone?.dropInteraction(interaction, sessionDidUpdate: session)
      ?? UIDropProposal(operation: .cancel)
  }

  func dropInteraction(_ interaction: UIDropInteraction, performDrop session: UIDropSession) {
    visibleZone?.dropInteraction(interaction, performDrop: session)
  }
}

/// A whole screen as a drop target: dropping on empty space moves the drag into the folder that screen
/// shows. A drag holding anything that already lives on this screen is declined, so it flies home
/// instead of "moving" to where it already is.
final class FrameDropZoneView: ExpoView, UIDropInteractionDelegate {
  let onDropItems = EventDispatcher()

  var ownedIds: Set<String> = []
  private var backSpringLoad: UISpringLoadedInteraction?

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addInteraction(UIDropInteraction(delegate: self))
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil, backSpringLoad == nil, let navigation = enclosingNavigationController()
    else { return }
    FrameBackSpringLoad.install(on: navigation)
    let interaction = FrameBackSpringLoad.interaction(for: navigation)
    addInteraction(interaction)
    backSpringLoad = interaction
  }

  private func enclosingNavigationController() -> UINavigationController? {
    var responder: UIResponder? = next
    while let current = responder {
      if let controller = current as? UIViewController, let navigation = controller.navigationController {
        return navigation
      }
      responder = current.next
    }
    return nil
  }

  private func accepts(_ session: UIDropSession) -> Bool {
    let payloads = FrameDragPayload.all(session)
    return !payloads.isEmpty && payloads.allSatisfy { !ownedIds.contains($0.id) }
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

  func dropInteraction(_ interaction: UIDropInteraction, performDrop session: UIDropSession) {
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    onDropItems(["items": FrameDragPayload.all(session).map { $0.event }])
  }
}
