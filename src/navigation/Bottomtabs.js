import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Accueil from '../services/Accueil'
import Profile from '../services/Profile'
import Colis from '../services/Colis'
import Tickets from '../services/Tickets'
import CustomBottomTabs from '../components/CustomBottomTabs'
import Compagnies from '../services/Compagnies'

const Tabs = createBottomTabNavigator()

const BottomTabs = () => {
  return (
    <Tabs.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomBottomTabs {...props} />}
    >
      <Tabs.Screen name="Accueil" component={Accueil} />
      <Tabs.Screen name="Colis" component={Colis} />
      <Tabs.Screen name="Compagnies" component={Compagnies} />
      <Tabs.Screen name="Tickets" component={Tickets} />
      <Tabs.Screen name="Profile" component={Profile} />
    </Tabs.Navigator>
  )
}

export default BottomTabs