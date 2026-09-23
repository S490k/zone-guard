export type TabScreenName = 'Dashboard' | 'Prepare' | 'Alerts' | 'EmergencyInfo';

export interface TabScreen {
  name: TabScreenName;
  label: string;
  icon: string;
}

export const TAB_SCREENS: TabScreen[] = [
  {
    name: 'Dashboard',
    label: 'Dashboard',
    icon: 'home',
  },
  {
    name: 'Prepare',
    label: 'Prepare',
    icon: 'list',
  },
  {
    name: 'Alerts',
    label: 'Alerts',
    icon: 'bell',
  },
  {
    name: 'EmergencyInfo',
    label: 'Emergency Info',
    icon: 'info',
  },
];

export const NAVIGATION_ROUTES = {
  TAB_NAVIGATOR: 'TabNavigator',
  ONBOARDING: 'Onboarding',
} as const;
