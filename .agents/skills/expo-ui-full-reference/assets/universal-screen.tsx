// Universal @expo/ui screen (SDK 56+). Drop in at e.g. app/settings.tsx; runs on iOS,
// Android, and web from this one file. Everything, including Host, imports from '@expo/ui'.
// Layout is Row/Column + spacing/alignment, never RN flexbox style on the children.
import { useState } from 'react';
import { Host, ScrollView, Column, Row, Spacer, Text, Switch, Slider, Button, Picker } from '@expo/ui';

const THEMES = ['System', 'Light', 'Dark'];

export default function SettingsScreen() {
  const [wifi, setWifi] = useState(true);
  const [brightness, setBrightness] = useState(0.5);
  const [theme, setTheme] = useState(0);

  return (
    // flex:1 because the Host wraps a scrollable; flexbox is allowed on the Host only.
    <Host style={{ flex: 1 }}>
      <ScrollView>
        <Column spacing={16} alignment="leading">
          <Text size={22} weight="bold">Settings</Text>

          <Row spacing={12} alignment="center">
            <Text>Wi-Fi</Text>
            <Spacer />
            <Switch value={wifi} onValueChange={setWifi} />
          </Row>

          <Column spacing={8} alignment="leading">
            <Text>Brightness</Text>
            <Slider value={brightness} onValueChange={setBrightness} min={0} max={1} />
          </Column>

          <Picker
            label="Theme"
            options={THEMES}
            selectedIndex={theme}
            onOptionSelected={({ nativeEvent }) => setTheme(nativeEvent.index)}
          />

          <Button onPress={() => console.log('saved')}>Save</Button>
        </Column>
      </ScrollView>
    </Host>
  );
}

// NOTE: Picker prop names vary by SDK/layer (some versions use options/selectedIndex/
// onOptionSelected, others selection/onSelectionChange). Confirm against the installed
// node_modules/@expo/ui/build/universal/Picker/index.d.ts before shipping.
