import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/shared/AppHeader';
import { fetchAdminTecnicosFromApi, fetchAdminGerentesFromApi } from '../../components/shared/admin/adminApi';
import { useAppTheme } from '../../context/ThemeContext';

const LIVE_LOCATION_MAX_AGE_MINUTES = 120;

const isValidLiveLocation = (location: any): location is { latitude: number; longitude: number; updated_at: string } => {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  const updatedAt = location?.updated_at;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;

  const ts = new Date(updatedAt || '').getTime();
  if (!ts || Number.isNaN(ts)) return false;

  const ageMinutes = (Date.now() - ts) / 60000;
  return ageMinutes >= 0 && ageMinutes <= LIVE_LOCATION_MAX_AGE_MINUTES;
};

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: #faf9f6;
    }
    .custom-pin {
      background-color: #7A1A1A;
      color: white;
      border-radius: 50%;
      border: 2px solid white;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([-23.55052, -46.633308], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    const markerMap = {};

    window.updateMarkers = function(techsData) {
      // Clear existing markers
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // Clear map object references
      for (const key in markerMap) {
        delete markerMap[key];
      }

      const markers = [];
      techsData.forEach(t => {
        if (t.latitude && t.longitude) {
          const marker = L.marker([t.latitude, t.longitude], {
            icon: L.divIcon({
              className: 'custom-pin-wrapper',
              html: '<div class="custom-pin">' + t.initials + '</div>',
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            })
          }).addTo(map)
          .bindPopup('<b>' + t.nome + '</b> (' + t.role + ')<br>Atualizado às ' + t.time);
          
          markerMap[t.id] = marker;
          markers.push(marker);
        }
      });

      if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.3));
      }
    };

    window.focusLocation = function(id, lat, lng) {
      map.setView([lat, lng], 16);
      const marker = markerMap[id];
      if (marker) {
        marker.openPopup();
      }
    };
  </script>
</body>
</html>
`;

export default function AdmMapaScreen() {
  const { colors } = useAppTheme();
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allTecnicos, allGerentes] = await Promise.all([
        fetchAdminTecnicosFromApi().catch(() => []),
        fetchAdminGerentesFromApi().catch(() => []),
      ]);

      const activeTecnicos = allTecnicos
        .filter(t => isValidLiveLocation(t.lastLocation))
        .map(t => ({ ...t, role: 'Técnico' }));

      const activeGerentes = allGerentes
        .filter(g => isValidLiveLocation(g.lastLocation))
        .map(g => ({ ...g, role: 'Gerente' }));

      const combined = [...activeTecnicos, ...activeGerentes];
      setTecnicos(combined);

      // Inject markers into Leaflet WebView
      const jsonPayload = combined.map(u => {
        const initialsMatch = u.nome.match(/\b\w/g);
        const initials = initialsMatch ? (initialsMatch[0] + (initialsMatch[1] || '')).toUpperCase() : 'TC';
        const dateObj = new Date(u.lastLocation!.updated_at);
        const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return {
          id: u.id,
          nome: u.nome,
          initials,
          latitude: u.lastLocation!.latitude,
          longitude: u.lastLocation!.longitude,
          time: timeStr,
          role: u.role,
        };
      });

      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`window.updateMarkers(${JSON.stringify(jsonPayload)}); true;`);
      }, 500);
    } catch (err) {
      console.warn('Erro ao carregar mapa de usuários:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLocations();
      const intervalId = setInterval(loadLocations, 30000); // Auto-update every 30s
      return () => clearInterval(intervalId);
    }, [loadLocations])
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.primary} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader
          title="Rastreamento"
          subtitle="Localização da equipe em campo"
          rightContent={
            <TouchableOpacity onPress={loadLocations} style={styles.headerBtn}>
              <Feather name="refresh-cw" size={20} color="#fff" />
            </TouchableOpacity>
          }
        />

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: MAP_HTML }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
          {isLoading && (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#7A1A1A" />
            </View>
          )}
        </View>

        {/* Technicians List Bottom Panel */}
        <View style={[styles.bottomPanel, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Equipe Ativa ({tecnicos.length})</Text>
          
          {tecnicos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="navigation-2" size={32} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>Nenhum membro da equipe transmitindo sinal de GPS no momento.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              {tecnicos.map((t) => {
                const initialsMatch = t.nome.match(/\b\w/g);
                const initials = initialsMatch ? (initialsMatch[0] + (initialsMatch[1] || '')).toUpperCase() : 'TC';
                const lastTime = new Date(t.lastLocation!.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <View key={t.id} style={[styles.techRow, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => {
                        webViewRef.current?.injectJavaScript(`window.focusLocation('${t.id}', ${t.lastLocation.latitude}, ${t.lastLocation.longitude}); true;`);
                      }}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.techName, { color: colors.text }]}>
                          {t.nome} <Text style={{ fontSize: 11, fontWeight: 'normal', color: colors.subtext }}>({t.role})</Text>
                        </Text>
                        <Text style={[styles.techTime, { color: colors.subtext }]}>
                          Sinal de GPS atualizado às {lastTime}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.mapBtn}
                      onPress={() => {
                        const url = `https://www.google.com/maps/search/?api=1&query=${t.lastLocation.latitude},${t.lastLocation.longitude}`;
                        Linking.openURL(url).catch((err) => console.warn('Erro ao abrir o Maps:', err));
                      }}
                    >
                      <Feather name="external-link" size={16} color="#7A1A1A" />
                      <Text style={styles.mapBtnText}>Navegar</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  headerBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 8,
    borderRadius: 10,
  },
  mapContainer: {
    flex: 3,
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 249, 246, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPanel: {
    flex: 2,
    borderTopWidth: 1.5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1.5,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7A1A1A',
  },
  techName: {
    fontSize: 14,
    fontWeight: '700',
  },
  techTime: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF9F6',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  mapBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A1A1A',
  },
});
