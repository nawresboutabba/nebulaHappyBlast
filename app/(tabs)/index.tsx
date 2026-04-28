import { useState } from 'react';
import { View } from 'react-native';
import HappyBlast from '@/components/HappyBlast';
import { NebulaBackground } from '@/components/NebulaBackground';

export default function HomeScreen() {
  const [showGame, setShowGame] = useState(true);

  if (!showGame) {
    return <NebulaBackground />;
  }

  return (
    <View style={{ flex: 1 }}>
      <HappyBlast onClose={() => setShowGame(false)} />
    </View>
  );
}
