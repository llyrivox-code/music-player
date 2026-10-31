import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet, Dimensions, StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate,
} from 'react-native-reanimated';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

const H = Dimensions.get('window').height;
const C = { bg: '#161235', panel: '#221C4A', text: '#F4F0FF', muted: '#9C94C9', accent: '#F5C542' };

// Free sample audio (SoundHelix). Swap in your own URLs or local files.
const TRACKS = [
  { id: '1', title: 'Night Shift', artist: 'Sample Artist A', color: '#6C4BD6' },
  { id: '2', title: 'Paper Planes', artist: 'Sample Artist B', color: '#D6504B' },
  { id: '3', title: 'Low Tide', artist: 'Sample Artist C', color: '#2E8FA8' },
  { id: '4', title: 'Slow Burn', artist: 'Sample Artist A', color: '#C77B2E' },
  { id: '5', title: 'Greenhouse', artist: 'Sample Artist D', color: '#3E9A63' },
].map((t, i) => ({ ...t, url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${i + 1}.mp3` }));

const fmt = (s = 0) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Cover({ track, size }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 10, backgroundColor: track.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size / 2.6, fontWeight: '800' }}>{track.title[0]}</Text>
    </View>
  );
}

export default function App() {
  const player = useAudioPlayer(TRACKS[0].url);
  const status = useAudioPlayerStatus(player);
  const [index, setIndex] = useState(null);
  const [query, setQuery] = useState('');
  const [liked, setLiked] = useState({});
  const [barW, setBarW] = useState(1);

  const open = useSharedValue(0); // 0 = mini player, 1 = full player
  const pct = useSharedValue(0);

  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }); }, []);

  const track = index === null ? null : TRACKS[index];
  const list = useMemo(
    () => TRACKS.filter(t => (t.title + t.artist).toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  const playAt = (i) => {
    const n = (i + TRACKS.length) % TRACKS.length;
    setIndex(n);
    player.replace(TRACKS[n].url);
    player.play();
  };

  useEffect(() => { if (status.didJustFinish) playAt((index ?? 0) + 1); }, [status.didJustFinish]);
  useEffect(() => {
    pct.value = withTiming(status.duration ? status.currentTime / status.duration : 0, { duration: 250 });
  }, [status.currentTime, status.duration]);

  const toggle = () => (status.playing ? player.pause() : player.play());
  const setOpen = (v) => { open.value = withSpring(v, { damping: 18, stiffness: 160 }); };

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(open.value, [0, 1], [H, 0]) }] }));
  const mini = useAnimatedStyle(() => ({ opacity: 1 - open.value, transform: [{ translateY: open.value * 40 }] }));
  const art = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(open.value, [0, 1], [0.7, 1]) }] }));
  const fill = useAnimatedStyle(() => ({ width: `${pct.value * 100}%` }));
  const miniFill = useAnimatedStyle(() => ({ width: `${pct.value * 100}%` }));

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <Text style={s.h1}>Your music</Text>
      <TextInput
        style={s.search} placeholder="Search songs or artists" placeholderTextColor={C.muted}
        value={query} onChangeText={setQuery}
      />
      <FlatList
        data={list}
        keyExtractor={t => t.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={<Text style={s.empty}>No songs match “{query}”. Try a different word.</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.row} onPress={() => playAt(TRACKS.indexOf(item))}>
            <Cover track={item} size={52} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.title, track?.id === item.id && { color: C.accent }]}>{item.title}</Text>
              <Text style={s.artist}>{item.artist}</Text>
            </View>
            <Pressable onPress={() => setLiked(l => ({ ...l, [item.id]: !l[item.id] }))} hitSlop={12}>
              <Text style={{ fontSize: 22, color: liked[item.id] ? C.accent : C.muted }}>{liked[item.id] ? '♥' : '♡'}</Text>
            </Pressable>
          </Pressable>
        )}
      />

      {track && (
        <Animated.View style={[s.mini, mini]} pointerEvents="box-none">
          <Pressable style={s.miniInner} onPress={() => setOpen(1)}>
            <Cover track={track} size={44} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.title} numberOfLines={1}>{track.title}</Text>
              <Text style={s.artist} numberOfLines={1}>{track.artist}</Text>
            </View>
            <Pressable onPress={toggle} hitSlop={12}>
              <Text style={s.miniBtn}>{status.playing ? '❚❚' : '▶'}</Text>
            </Pressable>
          </Pressable>
          <View style={s.miniTrack}><Animated.View style={[s.miniFill, miniFill]} /></View>
        </Animated.View>
      )}

      <Animated.View style={[s.sheet, sheet]} pointerEvents={track ? 'auto' : 'none'}>
        {track && (
          <>
            <Pressable onPress={() => setOpen(0)} hitSlop={16} style={{ alignSelf: 'flex-start' }}>
              <Text style={s.close}>⌄ Close</Text>
            </Pressable>
            <Animated.View style={[{ alignItems: 'center', marginTop: 32 }, art]}>
              <Cover track={track} size={Dimensions.get('window').width - 64} />
            </Animated.View>
            <View style={s.meta}>
              <View style={{ flex: 1 }}>
                <Text style={s.bigTitle}>{track.title}</Text>
                <Text style={s.artist}>{track.artist}</Text>
              </View>
              <Pressable onPress={() => setLiked(l => ({ ...l, [track.id]: !l[track.id] }))} hitSlop={12}>
                <Text style={{ fontSize: 28, color: liked[track.id] ? C.accent : C.muted }}>{liked[track.id] ? '♥' : '♡'}</Text>
              </Pressable>
            </View>
            <Pressable
              onLayout={e => setBarW(e.nativeEvent.layout.width)}
              onPress={e => status.duration && player.seekTo((e.nativeEvent.locationX / barW) * status.duration)}
              style={s.barHit}
            >
              <View style={s.bar}><Animated.View style={[s.barFill, fill]} /></View>
            </Pressable>
            <View style={s.times}>
              <Text style={s.artist}>{fmt(status.currentTime)}</Text>
              <Text style={s.artist}>{fmt(status.duration)}</Text>
            </View>
            <View style={s.controls}>
              <Pressable onPress={() => playAt(index - 1)} hitSlop={12}><Text style={s.ctl}>⏮</Text></Pressable>
              <Pressable onPress={toggle} style={s.play}><Text style={s.playTxt}>{status.playing ? '❚❚' : '▶'}</Text></Pressable>
              <Pressable onPress={() => playAt(index + 1)} hitSlop={12}><Text style={s.ctl}>⏭</Text></Pressable>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 64, paddingHorizontal: 16 },
  h1: { color: C.text, fontSize: 30, fontWeight: '800', marginBottom: 14 },
  search: { backgroundColor: C.panel, color: C.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  title: { color: C.text, fontSize: 16, fontWeight: '600' },
  artist: { color: C.muted, fontSize: 14, marginTop: 2 },
  empty: { color: C.muted, textAlign: 'center', marginTop: 40 },
  mini: { position: 'absolute', left: 8, right: 8, bottom: 28, backgroundColor: C.panel, borderRadius: 12, overflow: 'hidden' },
  miniInner: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  miniBtn: { color: C.text, fontSize: 20, paddingHorizontal: 12 },
  miniTrack: { height: 3, backgroundColor: '#3A3270' },
  miniFill: { height: 3, backgroundColor: C.accent },
  sheet: { position: 'absolute', top: 0, left: 0, right: 0, height: H, backgroundColor: C.bg, paddingTop: 64, paddingHorizontal: 32 },
  close: { color: C.muted, fontSize: 16 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 32 },
  bigTitle: { color: C.text, fontSize: 26, fontWeight: '800' },
  barHit: { paddingVertical: 14, marginTop: 14 },
  bar: { height: 5, backgroundColor: '#3A3270', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, backgroundColor: C.accent },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', marginTop: 28 },
  ctl: { color: C.text, fontSize: 32 },
  play: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  playTxt: { color: C.bg, fontSize: 26, fontWeight: '800' },
});
