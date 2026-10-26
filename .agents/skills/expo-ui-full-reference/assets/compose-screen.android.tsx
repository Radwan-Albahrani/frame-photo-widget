// Compose-only screen (Android). @expo/ui/jetpack-compose is Android-only and crashes on
// iOS, so this file MUST be a platform-extension component OUTSIDE the route tree:
//
//   components/SettingsForm.android.tsx   ← this file
//   app/settings.tsx                      ← route: `import S from '../components/SettingsForm'; export default S;`
//
// (Provide a SettingsForm.ios.tsx or SettingsForm.tsx fallback too.)
import { useState } from 'react';
import { Host } from '@expo/ui';                                  // Host ALWAYS from the universal root
import { Column, Row, Text, Switch, Slider, Button, Surface } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll, fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';

export default function SettingsForm() {
  const [wifi, setWifi] = useState(true);
  const [brightness, setBrightness] = useState(0.5);

  return (
    // flex:1, not matchContents — Column fills the screen here.
    <Host style={{ flex: 1 }}>
      <Surface modifiers={[fillMaxSize()]}>
        <Column verticalArrangement={{ spacedBy: 16 }} modifiers={[fillMaxWidth(), paddingAll(16)]}>
          <Text style={{ typography: 'titleLarge' }}>Settings</Text>

          <Row horizontalArrangement={{ spacedBy: 12 }}>
            <Text style={{ typography: 'bodyLarge' }}>Wi-Fi</Text>
            <Switch value={wifi} onValueChange={setWifi} />
          </Row>

          <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth()]}>
            <Text style={{ typography: 'bodyLarge' }}>Brightness</Text>
            <Slider value={brightness} onValueChange={setBrightness} />
          </Column>

          <Button onClick={() => console.log('saved')}>Save</Button>
        </Column>
      </Surface>
    </Host>
  );
}
