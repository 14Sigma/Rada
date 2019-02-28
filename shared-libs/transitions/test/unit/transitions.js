const sinon = require('sinon'),
      assert = require('chai').assert,
      transitions = require('../../src/transitions'),
      config = require('../../src/config'),
      _ = require('underscore');

const requiredFunctions = {
  onMatch: 1,
  filter: 1,
};

describe('transitions', () => {
  afterEach(() => sinon.restore());

  it('canRun returns false if filter returns false', () => {
    assert.equal(
      transitions.canRun({
        change: {
          doc: {},
          info: {},
        },
        transition: {
          filter: () => false,
        },
      }),
      false
    );
  });

  it('canRun returns true if filter returns true', () => {
    assert.equal(
      transitions.canRun({
        change: {
          doc: {},
          info: {},
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
  });

  it('canRun returns false if change is deletion', () => {
    assert.equal(
      transitions.canRun({
        change: {
          doc: {},
          info: {},
          deleted: true,
        },
        transition: {
          filter: () => true,
        },
      }),
      false
    );
  });

  it('canRun returns false if rev is same', () => {
    assert.equal(
      transitions.canRun({
        key: 'x',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {
              x: {
                last_rev: '1',
              },
            },
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      false
    );
  });

  it('canRun returns true if rev is different', () => {
    assert.equal(
      transitions.canRun({
        key: 'x',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {
              x: {
                last_rev: '2',
              },
            },
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
  });

  it('canRun returns true if transition is not defined', () => {
    assert.equal(
      transitions.canRun({
        key: 'foo',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {
              baz: {
                last_rev: '2',
              },
            },
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
    assert.equal(
      transitions.canRun({
        key: 'foo',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {},
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
  });



  // A list of states to test, first arg is the `transitions` config value and
  // second is whether you expect loadTransition to get called.
  const loadTests = [
    // empty configuration
    { name: 'empty', given: {}, expectedCalls: { load: false, attach: true } },
    {
      name: 'undefined',
      given: undefined,
      expectedCalls: { load: false, attach: true },
    },
    { name: 'null', given: null, expectedCalls: { load: false, attach: true } },

    // falsey configuration
    {
      name: 'transition null',
      given: { registration: null },
      expectedCalls: { load: false, attach: true },
    },
    {
      name: 'transition undefined',
      given: { registration: undefined },
      expectedCalls: { load: false, attach: true },
    },
    {
      name: 'transition false',
      given: { registration: false },
      expectedCalls: { load: false, attach: true },
    },

    // invalid configurations
    {
      name: 'unknown name',
      given: { foo: true },
      expectedCalls: { load: false, attach: false },
    },

    // available and enabled
    {
      name: 'transition empty',
      given: { registration: {} },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'transition true',
      given: { registration: true },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'transition string',
      given: { registration: 'x' },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'transition object',
      given: { registration: { param: 'val' } },
      expectedCalls: { load: true, attach: true },
    },

    // support old style
    {
      name: 'old style',
      given: { registration: { load: '../etc/passwd' } },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'old style true',
      given: { registration: { disable: true } },
      expectedCalls: { load: false, attach: true },
    },
    {
      name: 'old style false',
      given: { registration: { disable: false } },
      expectedCalls: { load: true, attach: true },
    },
  ];
  loadTests.forEach(loadTest => {
    it(`loadTransitions loads configured transitions: ${loadTest.name}`, () => {
      sinon.stub(config, 'get').returns(loadTest.given);
      const load = sinon.stub(transitions, '_loadTransition');
      try {
        transitions.loadTransitions();
      } catch (e) {
        // not empty
      }
      assert.equal(load.callCount, loadTest.expectedCalls.load ? 1 : 0);
    });
  });

  transitions.availableTransitions().forEach(name => {
    const transition = require(`../../src/transitions/${name}`);
    Object.keys(requiredFunctions).forEach(key => {
      it(`Checking ${key} signature for ${name} transition`, () => {
        assert(_.isFunction(transition[key]), 'Required function not found');
        assert.equal(
          transition[key].length,
          requiredFunctions[key],
          'Function takes the wrong number of parameters'
        );
      });
    });
  });

  it('loadTransitions does not load system transitions that have been explicitly disabled', () => {
    sinon.stub(config, 'get').returns({ death_reporting: { disable: true } });
    const stub = sinon.stub(transitions, '_loadTransition');
    transitions.loadTransitions();
    assert.equal(stub.calledWith('death_reporting'), false);
  });

  it('loadTransitions loads system transitions by default', () => {
    sinon.stub(config, 'get').returns({});
    const stub = sinon.stub(transitions, '_loadTransition');
    transitions.loadTransitions();
    assert.equal(stub.callCount, 0);
  });

  //TODO add test for synchronous only transitions!
});
