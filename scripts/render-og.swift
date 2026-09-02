import AppKit
import WebKit
let args = CommandLine.arguments
let src = URL(fileURLWithPath: args[1]); let out = URL(fileURLWithPath: args[2])
let width = CGFloat(Double(args[3]) ?? 1200); let height = CGFloat(Double(args[4]) ?? 630)
let app = NSApplication.shared; app.setActivationPolicy(.prohibited)
let config = WKWebViewConfiguration()
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: width, height: height), configuration: config)
let window = NSWindow(contentRect: web.frame, styleMask: .borderless, backing: .buffered, defer: false)
window.contentView = web
final class Nav: NSObject, WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            let snap = WKSnapshotConfiguration(); snap.rect = webView.bounds; snap.snapshotWidth = NSNumber(value: Double(width))
            webView.takeSnapshot(with: snap) { image, error in
                guard let image, let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) else { print("snapshot failed", error ?? ""); exit(1) }
                try! png.write(to: out); print("wrote", out.path, Int(rep.pixelsWide), "x", Int(rep.pixelsHigh)); exit(0)
            }
        }
    }
}
let nav = Nav(); web.navigationDelegate = nav
web.loadFileURL(src, allowingReadAccessTo: src.deletingLastPathComponent())
app.run()
