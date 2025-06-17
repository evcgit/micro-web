import { createContext, useReducer, useEffect } from 'react';
import { getCurrentUser } from '../Shared/Api';
import { getThemePreference, getTokens } from '../Shared/Utils/Helpers';

const AppContext = createContext(null);

const initialState = {
  user: null,
  isAuthenticated: false,
  theme: getThemePreference(),
  ...getTokens()
};

export const ACTION_TYPES = {
  INITIALIZING: 'INITIALIZING',
  INIT_COMPLETE: 'INIT_COMPLETE',
  LOGGING_IN: 'LOGGING_IN',
  LOGIN_ERROR: 'LOGIN_ERROR',
  LOGGED_IN: 'LOGGED_IN',
  LOGGED_OUT: 'LOGGED_OUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_THEME: 'SET_THEME'
};

const reducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.INITIALIZING:
      return {
        ...state,
        initialized: false,
        isInitializing: true
      };
    case ACTION_TYPES.INIT_COMPLETE:
      return {
        ...state,
        initialized: true,
        isInitializing: false
      };
    case ACTION_TYPES.LOGGING_IN:
      return {
        ...state,
        isLoggingIn: true
      };
    case ACTION_TYPES.LOGIN_ERROR:
      return {
        ...state,
        isAuthenticated: false,
        isLoggingIn: false,
        accessToken: null,
        refreshToken: null,
        user: {}
      };
    case ACTION_TYPES.LOGGED_IN:
      return {
        ...state,
        isLoggingIn: false,
        isAuthenticated: true,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken
      };
    case ACTION_TYPES.LOGGED_OUT:
      return {
        ...state,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        pageTitle: '',
        siteAlerts: [],
        user: {}
      };
    case ACTION_TYPES.UPDATE_USER:
      return {
        ...state,
        user: {
          id: action.payload.id || state.user.id || null,
          email: action.payload.email,
          firstName: action.payload.first_name,
          lastName: action.payload.last_name,
          username: action.payload.username,
          role: action.payload.role
        }
      };
    case ACTION_TYPES.SET_THEME:
      return {
        ...state,
        theme: action.payload
      };
    default:
      return state;
  }
};

const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = { state, dispatch };

  useEffect(() => {
    const { accessToken, refreshToken } = getTokens();
    if (accessToken) {
      dispatch({
        type: ACTION_TYPES.INITIALIZING
      });
      getCurrentUser(dispatch)
        .then(() => {
          dispatch({
            type: ACTION_TYPES.LOGGED_IN,
            payload: {
              accessToken,
              refreshToken
            }
          });
        })
        .catch(() => {
          dispatch({
            type: ACTION_TYPES.LOGIN_ERROR
          });
        })
        .finally(() => {
          dispatch({
            type: ACTION_TYPES.INIT_COMPLETE
          });
        });
    }
  }, []);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export { AppContext, AppProvider };
