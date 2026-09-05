import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const CACHE_KEY = '@amor/system-update-policy-v1';
const TIMEOUT_MS = 8000;

function majorMinor(version) {
  const match = String(version || '').trim().match(/^(\d+)\.(\d+)/);
  return match ? { major: Number(match[1]), minor: Number(match[2]) } : null;
}

function isOlder(installed, required) {
  const a = majorMinor(installed); const b = majorMinor(required);
  return Boolean(a && b && (a.major < b.major || (a.major === b.major && a.minor < b.minor)));
}

export default function SystemUpdateGate({ version, visible = true }) {
  const [policy, setPolicy] = useState(null); const [loading, setLoading] = useState(true); const [opening, setOpening] = useState(false);
  const check = useCallback(async () => {
    let cached = null;
    try { cached = JSON.parse(await AsyncStorage.getItem(CACHE_KEY) || 'null'); if (cached) setPolicy(cached); } catch {}
    try {
      const request = getDocFromServer(doc(db, 'actualizaciones', 'amor'));
      const snapshot = await Promise.race([request, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS))]);
      if (snapshot.exists()) { const fresh = snapshot.data(); setPolicy(fresh); await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)); }
    } catch { /* Sin política confirmada, no se bloquea la app. */ }
    setLoading(false);
  }, []);
  useEffect(() => { check(); }, [check]);
  const required = policy?.obligatoria === true && isOlder(version, policy.buildVersionMinima || policy.versionMinimaBuild || policy.buildVersion || policy.version);
  async function openSystem() { setOpening(true); try { await Linking.openURL('loveweb://'); } catch { setOpening(false); } }
  if (!visible || loading || !required) return null;
  return <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}><View style={s.overlay}><View style={s.card}><Text style={s.eyebrow}>ACTUALIZACIÓN NECESARIA</Text><Text style={s.title}>Amor necesita una nueva build</Text><Text style={s.body}>{policy.mensaje || 'Para continuar usando Amor, descargá la nueva versión desde Love System.'}</Text><View style={s.version}><Text style={s.versionText}>Versión mínima · {policy.buildVersionMinima || policy.versionMinimaBuild || policy.buildVersion || policy.version}</Text></View><Pressable disabled={opening} style={s.button} onPress={openSystem}>{opening ? <ActivityIndicator color="#000" /> : <Text style={s.buttonText}>Abrir Love System</Text>}</Pressable><Text style={s.hint}>La app se habilitará cuando esté actualizada.</Text></View></View></Modal>;
}

const s = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.78)', alignItems: 'center', justifyContent: 'center', padding: 28 }, card: { width: '100%', maxWidth: 390, backgroundColor: '#111', borderRadius: 24, borderWidth: 1, borderColor: '#F58BAF', padding: 26, alignItems: 'center' }, eyebrow: { color: '#F58BAF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' }, title: { color: '#FFF', fontSize: 25, fontWeight: '800', textAlign: 'center', marginTop: 12 }, body: { color: '#B7B7B7', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 13 }, version: { backgroundColor: '#242424', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginTop: 18 }, versionText: { color: '#F58BAF', fontSize: 12, fontWeight: '800' }, button: { width: '100%', minHeight: 48, borderRadius: 14, backgroundColor: '#F58BAF', alignItems: 'center', justifyContent: 'center', marginTop: 22 }, buttonText: { color: '#000', fontSize: 14, fontWeight: '900' }, hint: { color: '#777', fontSize: 11, textAlign: 'center', marginTop: 13 } });
