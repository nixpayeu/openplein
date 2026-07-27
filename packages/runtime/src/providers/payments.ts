export const paymentsProvider = {
  async pay(_appId: string, _params: unknown, _token: string): Promise<never> {
    throw new Error("payments-provider nog niet geconfigureerd");
  },
};
