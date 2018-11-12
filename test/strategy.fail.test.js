import { passport, expect } from 'chai';
import nock from 'nock';
import KeycloakBearerStrategy from '../src';
import { validToken, jwksResponse } from './testData';

const options = {
  realm: 'realm',
  host: 'https://host.com',
  clientId: 'clientId',
};

describe('KeycloakBearerStrategy', () => {
  describe('failing a request in user-callback', () => {
    const strategy = new KeycloakBearerStrategy(options, ((verifidToken, done) => done(null, false, 'The access token expired')));
    let challenge;

    before((done) => {
      nock(options.host)
        .get(`/auth/realms/${options.realm}/protocol/openid-connect/certs`)
        .reply(200, jwksResponse);

      passport.use(strategy)
        .fail((c) => {
          challenge = c.toString();
          done();
        })
        .req((req) => {
          req.headers.authorization = `Bearer ${validToken}`;
        })
        .authenticate();
    });

    it('should fail with challenge', () => {
      expect(challenge).to.be.a('string');
      expect(challenge).to.equal('The access token expired');
    });
  });

  describe('handling a request with wrong token', () => {
    let challenge;
    const strategy = new KeycloakBearerStrategy(options, ((verifidToken, done) => {
      if (verifidToken) {
        return done(null, verifidToken, { scope: 'read' });
      }
      return done(null, false);
    }));
    before((done) => {
      nock(options.host)
        .get(`/auth/realms/${options.realm}/protocol/openid-connect/userinfo`)
        .reply(200);

      passport.use(strategy)
        .fail((c) => {
          challenge = c.toString();
          done();
        })
        .req((req) => {
          req.headers.authorization = 'Bearer WRONG';
        })
        .authenticate();
    });

    it('should fail with challenge', () => {
      expect(challenge).to.be.a('string');
      expect(challenge).to.equal('JsonWebTokenError: jwt malformed');
    });
  });
});