export const init = jest.fn();
export const setUser = jest.fn();
export const registerNavigationContainer = jest.fn();
export const reactNavigationIntegration = jest.fn(() => ({
  name: 'ReactNavigation',
  registerNavigationContainer,
}));

export function __resetSentryMock(): void {
  init.mockReset();
  setUser.mockReset();
  registerNavigationContainer.mockReset();
  reactNavigationIntegration.mockClear();
}
