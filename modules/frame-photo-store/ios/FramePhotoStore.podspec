require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', '..', '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'FramePhotoStore'
  s.version        = package['version']
  s.summary        = 'Downsamples picked photos into the Frame App Group container.'
  s.description    = 'Writes widget-sized JPEGs into the shared App Group container and mirrors the widget snapshot.'
  s.author         = 'Frame'
  s.homepage       = 'https://expo.dev'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
