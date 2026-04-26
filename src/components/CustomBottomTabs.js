import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialCommunityIcons, } from '@expo/vector-icons'
import COLORS from "../utils/COLORS"
import Ionicons from '@expo/vector-icons/Ionicons';

const ICONS = {
  Accueil: { active: 'home-variant', inactive: 'home-variant-outline' },
  Colis: { active: 'package-variant', inactive: 'package-variant-closed' },
  Tickets: { active: 'ticket-confirmation', inactive: 'ticket-confirmation-outline' },
  Compagnies: { active: "bus", inactive: 'bus' },
  Profile: { active: 'account-circle', inactive: 'account-circle-outline' },
}


export default function CustomBottomTabs({ state, descriptors, navigation }) {
  const labelMap = {
    Accueil: "Accueil",
    Colis: "Colis",
    Tickets: "Tickets",
    Compagnies: "Compagnies",
    Profile: "Profil",
  }

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        const rawLabel = options.tabBarLabel ?? options.title ?? route.name
        const label = typeof rawLabel === "string" ? (labelMap[rawLabel] || rawLabel) : route.name
        const isFocused = state.index === index
        const iconSet = ICONS[route.name] || {}
        const iconName = isFocused ? iconSet.active : iconSet.inactive

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          })
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <MaterialCommunityIcons
                name={iconName || 'circle'}
                size={22}
                color={isFocused ? COLORS.primary : COLORS.muted}
              />
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
   
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
   
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
 
  label: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  labelActive: {
    color: COLORS.primary,
  },
})
