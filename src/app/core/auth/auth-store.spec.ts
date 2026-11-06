import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth-store';
import { FirebaseIdentity } from './firebase-identity';
import { IdentityApi, IdentityProfile } from './identity-api';

const profile: IdentityProfile = {
  tenantId: 't-1',
  email: 'ada@example.com',
  displayName: 'Ada Yılmaz',
  role: 'owner',
  emailVerified: true,
  membershipStatus: 'active',
  trialEndsAt: null,
  onboardingCompleted: true,
  tenant: { name: 'Acme', subscriptionEndsAt: null, inGrace: false },
};

describe('AuthStore session cache', () => {
  let user: { displayName: string; email: string } | null;
  beforeEach(() => {
    localStorage.clear();
    user = null;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FirebaseIdentity,
          useValue: {
            initialize: async () => undefined,
            user: () => user,
            signIn: async () => (user = { displayName: 'Ada Yılmaz', email: profile.email }),
            logout: async () => (user = null),
          },
        },
        { provide: IdentityApi, useValue: { me: async () => profile } },
      ],
    });
  });

  it('lets guards see a sign-in that happened after an anonymous check', async () => {
    const store = TestBed.inject(AuthStore);
    expect(await store.ensureSession()).toBeNull();
    await store.signIn(profile.email, 'secret');
    expect((await store.ensureSession())?.tenantId).toBe('t-1');
  });

  it('forgets the session on logout', async () => {
    const store = TestBed.inject(AuthStore);
    await store.signIn(profile.email, 'secret');
    await store.logout();
    expect(await store.ensureSession()).toBeNull();
    expect(store.session()).toBeNull();
  });
});
