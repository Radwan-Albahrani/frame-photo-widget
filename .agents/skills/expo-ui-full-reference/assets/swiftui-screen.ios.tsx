// SwiftUI-only screen (iOS). @expo/ui/swift-ui is iOS-only and crashes on Android, so this
// file MUST be a platform-extension component OUTSIDE the route tree:
//
//   components/SettingsForm.ios.tsx   ← this file
//   app/settings.tsx                  ← route: `import S from '../components/SettingsForm'; export default S;`
//
// (Provide a SettingsForm.android.tsx or SettingsForm.tsx fallback too, or Expo Router will
//  error on platforms without a match.)
import { useState } from 'react';
import { Host } from '@expo/ui';                       // Host ALWAYS from the universal root
import { List, Section, Toggle, Picker, Button, Text } from '@expo/ui/swift-ui';
import { listStyle, pickerStyle, tag, buttonStyle } from '@expo/ui/swift-ui/modifiers';

const THEMES = ['System', 'Light', 'Dark'];

export default function SettingsForm() {
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);
  const [theme, setTheme] = useState(0);

  return (
    <Host style={{ flex: 1 }}>
      <List modifiers={[listStyle('insetGrouped')]}>
        <Section title="Connectivity">
          <Toggle label="Wi-Fi" isOn={wifi} onIsOnChange={setWifi} />
          <Toggle label="Bluetooth" isOn={bluetooth} onIsOnChange={setBluetooth} />
        </Section>

        <Section title="Appearance">
          <Picker
            label="Theme"
            selection={theme}
            onSelectionChange={setTheme}
            modifiers={[pickerStyle('menu')]}>
            {THEMES.map((t, i) => (
              <Text key={t} modifiers={[tag(i)]}>{t}</Text>
            ))}
          </Picker>
        </Section>

        <Section title="Account">
          <Button label="Sign out" role="destructive" onPress={() => {}} modifiers={[buttonStyle('bordered')]} />
        </Section>
      </List>
    </Host>
  );
}
