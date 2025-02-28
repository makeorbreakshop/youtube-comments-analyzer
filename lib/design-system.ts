// Design tokens for consistent styling
export const tokens = {
  typography: {
    title: {
      page: 'text-2xl font-bold text-gray-900',
      section: 'text-xl font-semibold text-gray-900',
      card: 'text-lg font-medium text-gray-900',
    },
    body: {
      default: 'text-sm text-gray-700',
      meta: 'text-xs text-gray-500',
    },
  },
  spacing: {
    page: {
      default: 'p-4 sm:p-6 lg:p-8',
    },
    section: {
      default: 'mb-6 sm:mb-8',
    },
    card: {
      default: 'p-4 sm:p-6',
    },
    stack: {
      default: 'space-y-4',
      sm: 'space-y-2',
      lg: 'space-y-6',
    },
  },
  rounded: {
    default: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  },
  shadows: {
    sm: 'shadow-sm',
    default: 'shadow',
    lg: 'shadow-lg',
  },
  colors: {
    primary: {
      50: 'bg-primary-50',
      500: 'bg-primary-500',
      600: 'bg-primary-600',
      700: 'bg-primary-700',
    },
    gray: {
      50: 'bg-gray-50',
      100: 'bg-gray-100',
      200: 'bg-gray-200',
      300: 'bg-gray-300',
      500: 'bg-gray-500',
      700: 'bg-gray-700',
      900: 'bg-gray-900',
    },
  },
};

// Component style compositions
export const componentStyles = {
  card: {
    default: 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden',
  },
  button: {
    primary: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-150',
    secondary: 'inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-150',
  },
  input: {
    default: 'block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm',
  },
  navLink: {
    default: 'text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium',
    active: 'text-primary-600 hover:text-primary-700 px-3 py-2 rounded-md text-sm font-medium',
  },
}; 