const assert = require('assert');
const ProperSkipList = require('../');

function getLayerKeys(skipList) {
  let layerIndex = 0;
  let layerHeadNode = skipList.head.nodes[layerIndex];
  let layers = [];
  let c = 0;
  while (layerHeadNode) {
    let layerEntries = [];
    let currentNode = layerHeadNode;
    while (currentNode) {
      layerEntries.push(currentNode.group.key);
      currentNode = currentNode.next;
    }
    layers.push(layerEntries);
    layerIndex++;
    layerHeadNode = skipList.head.nodes[layerIndex];
  }
  return layers;
}

function logLayerKeys(skipList) {
  let layers = getLayerKeys(skipList).reverse();
  for (let layer of layers) {
    console.log(layer.join(','));
  }
}

describe('ProperSkipList tests', function () {
  let skipList;
  let result;

  describe('#insert', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
    });

    it('should insert numeric keys in sorted order inside the skip list', async function () {
      for (let i = 0; i < 100; i++) {
        skipList.insert(i, `value${i}`);
      }

      let currentNode = skipList.head.nodes[0].next;
      while (currentNode && currentNode.next) {
        assert.equal(currentNode.group.value === `value${currentNode.group.key}`, true);
        assert.equal(currentNode.group.key > currentNode.prev.group.key || currentNode.prev.group.key === undefined, true);
        currentNode = currentNode.next;
      }
    });

    it('should allow an existing numeric key to be replaced', async function () {
      for (let i = 0; i < 100; i++) {
        skipList.insert(i, `value${i}`);
      }
      result = skipList.find(11);
      assert.equal(result, 'value11');

      skipList.insert(11, 'updated');

      result = skipList.find(11);
      assert.equal(result, 'updated');
    });

    it('should have multiple layers of decreasing size', async function () {
      for (let i = 0; i < 1000; i++) {
        skipList.insert(i, `value${i}`);
      }
      let layers = getLayerKeys(skipList);

      let len = layers.length;
      for (let i = 1; i < len; i++) {
        assert.equal(layers[i].length <= layers[i - 1].length, true);
      }
    });

    it('should support inserting and updating values with strings as keys', async function () {
      for (let i = 0; i < 100; i++) {
        skipList.insert(`key${i}`, `value${i}`);
      }
      result = skipList.find('key88');
      assert.equal(result, 'value88');

      skipList.insert('key88', 'updated');

      result = skipList.find('key88');
      assert.equal(result, 'updated');
    });

    it('should store string keys based on lexicographical order', async function () {
      for (let i = 4; i >= 0; i--) {
        skipList.insert(`key${i}`, `value${i}`);
      }
      let currentNode = skipList.head.nodes[0].next;
      assert.equal(currentNode.group.key === 'key0', true);
      assert.equal(currentNode.group.value === 'value0', true);
      currentNode = currentNode.next;
      assert.equal(currentNode.group.key === 'key1', true);
      assert.equal(currentNode.group.value === 'value1', true);
      currentNode = currentNode.next;
      assert.equal(currentNode.group.key === 'key2', true);
      assert.equal(currentNode.group.value === 'value2', true);
      currentNode = currentNode.next;
      assert.equal(currentNode.group.key === 'key3', true);
      assert.equal(currentNode.group.value === 'value3', true);
      currentNode = currentNode.next;
      assert.equal(currentNode.group.key === 'key4', true);
      assert.equal(currentNode.group.value === 'value4', true);
    });

    it('should support mixing string and numeric keys', async function () {
      for (let i = 2; i >= 0; i--) {
        skipList.insert(`key${i}`, `string${i}`);
      }
      for (let i = 2; i >= 0; i--) {
        skipList.insert(i, `number${i}`);
      }
      let currentNode = skipList.head.nodes[0].next;
      assert.equal(currentNode.group.key === 0, true);
      assert.equal(currentNode.group.value === 'number0', true);
      currentNode = currentNode.next;
      assert.equal(currentNode.group.key === 1, true);
      assert.equal(currentNode.group.value === 'number1', true);
      currentNode = currentNode.next;
      assert.equal(currentNode.group.key === 2, true);
      assert.equal(currentNode.group.value === 'number2', true);
      currentNode = currentNode.next;
      assert.equal(currentNode.group.key === 'key0', true);
      assert.equal(currentNode.group.value === 'string0', true);
      currentNode = currentNode.next;
      assert.equal(currentNode.group.key === 'key1', true);
      assert.equal(currentNode.group.value === 'string1', true);
      currentNode = currentNode.next;
      assert.equal(currentNode.group.key === 'key2', true);
      assert.equal(currentNode.group.value === 'string2', true);
    });
  });

  describe('#find', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
      for (let i = 0; i < 1000; i++) {
        skipList.insert(i, `value${i}`);
      }
      skipList.insert('hello', 'world');
      skipList.insert('foo', 'bar');
    });

    it('should be able to find an entry which was previously inserted', async function () {
      result = skipList.find(900);
      assert.equal(result === 'value900', true);
      result = skipList.find('foo');
      assert.equal(result === 'bar', true);
    });
  });

  describe('#delete', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
    });

    it('', async function () {

    });
  });

  describe('#min', function () {
    describe('when skip list contains many values', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
        for (let i = 999; i >= 3; i--) {
          skipList.insert(i, `value${i}`);
        }
      });

      it('should be able to get the lowest key', async function () {
        result = skipList.minKey();
        assert.equal(result === 3, true);
      });

      it('should be able to get the value at the lowest key', async function () {
        result = skipList.minValue();
        assert.equal(result === 'value3', true);
      });

    });

    describe('when skip list is empty', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
      });

      it('should return undefined when minKey is called', async function () {
        result = skipList.minKey();
        assert.equal(result === undefined, true);
      });

      it('should return undefined when minValue is called', async function () {
        result = skipList.minValue();
        assert.equal(result === undefined, true);
      });
    });
  });

  describe('#max', function () {
    describe('when skip list contains many values', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
        for (let i = 999; i >= 3; i--) {
          skipList.insert(i, `value${i}`);
        }
      });

      it('should be able to get the highest key', async function () {
        result = skipList.maxKey();
        assert.equal(result === 999, true);
      });

      it('should be able to get the value at the highest key', async function () {
        result = skipList.maxValue();
        assert.equal(result === 'value999', true);
      });
    });

    describe('when skip list is empty', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
      });

      it('should return undefined when maxKey is called', async function () {
        result = skipList.maxKey();
        assert.equal(result === undefined, true);
      });

      it('should return undefined when maxValue is called', async function () {
        result = skipList.maxValue();
        assert.equal(result === undefined, true);
      });
    });
  });

  describe('#findNode', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
    });

    it('', async function () {

    });
  });

  describe('#findSegment', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
    });

    it('', async function () {

    });
  });

  describe('#deleteSegment', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
    });

    it('', async function () {

    });
  });

  describe('#extract', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
    });

    it('', async function () {

    });
  });
});
