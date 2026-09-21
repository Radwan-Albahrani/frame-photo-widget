require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', '..', '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'FrameContextMenu'
  s.version        = package['version']
  s.summary        = 'UIKit context menu attached directly to a React Native view.'
  s.description    = 'Long-press lift or tap-to-open UIMenu on a plain UIKit container, with no SwiftUI hosting of React Native children.'
  s.author         = 'Frame'
  s.homepage       = 'https://expo.dev'
  s.platforms      = { :ios => '18.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
