const assert = require('assert');
const ProperSkipList = require('../');

function getLayerEntries(skipList) {
  let layerIndex = 0;
  let layerHeadNode = skipList.head.nodes[layerIndex];
  let layers = [];
  let c = 0;
  while (layerHeadNode) {
    let layerEntries = [];
    let currentNode = layerHeadNode;
    while (currentNode) {
      let {key, value} = currentNode.group;
      layerEntries.push([key, value]);
      currentNode = currentNode.next;
    }
    layers.push(layerEntries);
    layerIndex++;
    layerHeadNode = skipList.head.nodes[layerIndex];
  }
  return layers;
}

function getLayerKeys(skipList) {
  return getLayerEntries(skipList).map((layer) => layer.map((entry) => {
    let key = entry[0];
    if (typeof key === 'string') {
      return `"${key}"`;
    }
    return key;
  }));
}

function logLayerKeys(skipList) {
  let layers = getLayerKeys(skipList).reverse();
  for (let layer of layers) {
    console.log(layer.map(key => String(key)).join(','));
  }
}

function logLayerEntries(skipList) {
  let layers = getLayerEntries(skipList).reverse();
  for (let layer of layers) {
    console.log(layer.map(entry => `${entry[0]}=${entry[1]}`).join(','));
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
        assert(currentNode.group.value === `value${currentNode.group.key}`);
        assert(currentNode.group.key > currentNode.prev.group.key || currentNode.prev.group.key === undefined);
        currentNode = currentNode.next;
      }
    });

    it('should allow an existing numeric key to be replaced', async function () {
      for (let i = 0; i < 100; i++) {
        skipList.insert(i, `value${i}`);
      }
      result = skipList.find(11);
      assert(result, 'value11');

      skipList.insert(11, 'updated');

      result = skipList.find(11);
      assert(result, 'updated');
    });

    it('should have multiple layers of decreasing size', async function () {
      for (let i = 0; i < 1000; i++) {
        skipList.insert(i, `value${i}`);
      }
      let layers = getLayerKeys(skipList);

      let len = layers.length;
      for (let i = 1; i < len; i++) {
        assert(layers[i].length <= layers[i - 1].length);
      }
    });

    it('should support inserting and updating values with strings as keys', async function () {
      for (let i = 0; i < 100; i++) {
        skipList.insert(`key${i}`, `value${i}`);
      }
      result = skipList.find('key88');
      assert(result, 'value88');

      skipList.insert('key88', 'updated');

      result = skipList.find('key88');
      assert(result, 'updated');
    });

    it('should store string keys based on lexicographical order', async function () {
      for (let i = 4; i >= 0; i--) {
        skipList.insert(`key${i}`, `value${i}`);
      }
      let currentNode = skipList.head.nodes[0].next;
      assert(currentNode.group.key === 'key0');
      assert(currentNode.group.value === 'value0');
      currentNode = currentNode.next;
      assert(currentNode.group.key === 'key1');
      assert(currentNode.group.value === 'value1');
      currentNode = currentNode.next;
      assert(currentNode.group.key === 'key2');
      assert(currentNode.group.value === 'value2');
      currentNode = currentNode.next;
      assert(currentNode.group.key === 'key3');
      assert(currentNode.group.value === 'value3');
      currentNode = currentNode.next;
      assert(currentNode.group.key === 'key4');
      assert(currentNode.group.value === 'value4');
    });

    it('should support mixing string and numeric keys', async function () {
      for (let i = 2; i >= 0; i--) {
        skipList.insert(`key${i}`, `string${i}`);
      }
      for (let i = 2; i >= 0; i--) {
        skipList.insert(i, `number${i}`);
      }
      let currentNode = skipList.head.nodes[0].next;
      assert(currentNode.group.key === 0);
      assert(currentNode.group.value === 'number0');
      currentNode = currentNode.next;
      assert(currentNode.group.key === 1);
      assert(currentNode.group.value === 'number1');
      currentNode = currentNode.next;
      assert(currentNode.group.key === 2);
      assert(currentNode.group.value === 'number2');
      currentNode = currentNode.next;
      assert(currentNode.group.key === 'key0');
      assert(currentNode.group.value === 'string0');
      currentNode = currentNode.next;
      assert(currentNode.group.key === 'key1');
      assert(currentNode.group.value === 'string1');
      currentNode = currentNode.next;
      assert(currentNode.group.key === 'key2');
      assert(currentNode.group.value === 'string2');
    });

    it('should support using null and undefined as keys', async function () {
      skipList.insert(null, 'value1');
      skipList.insert(undefined, 'value2');
      let layers = getLayerEntries(skipList);
      let bottomLayer = layers[0];
      assert(bottomLayer[1][0] === undefined);
      assert(bottomLayer[2][0] === null);
    });

    it('should support mixing null, undefined, strings and numbers as keys', async function () {
      skipList.insert(undefined, '[undefined]');
      skipList.insert(null, '[null]');
      skipList.insert(3, 'number3');
      skipList.insert(10, 'number10');
      skipList.insert('3', 'string3');
      skipList.insert('4', 'string4');
      skipList.insert('hello', 'stringhello');
      skipList.insert('test', 'stringtest');

      let layers = getLayerEntries(skipList);
      let bottomLayer = layers[0];
      assert(bottomLayer[1][0] === undefined);
      assert(bottomLayer[2][0] === null);
      assert(bottomLayer[3][0] === 3);
      assert(bottomLayer[4][0] === 10);
      assert(bottomLayer[5][0] === '3');
      assert(bottomLayer[6][0] === '4');
      assert(bottomLayer[7][0] === 'hello');
      assert(bottomLayer[8][0] === 'test');

    });
  });

  describe('#find', function () {
    describe('when skip list contains many values', function () {
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
        assert(result === 'value900');
        result = skipList.find('foo');
        assert(result === 'bar');
      });

      it('should return undefined if value is not found', async function () {
        result = skipList.find(1111);
        assert(result === undefined);
      });
    });

    describe('when skip list is empty', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
      });

      it('should return undefined', async function () {
        result = skipList.find(900);
        assert(result === undefined);
      });
    });
  });

  describe('#delete', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
      for (let i = 0; i < 20; i++) {
        skipList.insert(i, `value${i}`);
      }
    });

    it('should delete an entry from all layers', async function () {
      skipList.delete(10);
      let layers = getLayerKeys(skipList);
      for (let layer of layers) {
        for (let key of layer) {
          assert(key != 10);
        }
      }
    });

    it('should be able to delete null key entries', async function () {
      skipList.insert(null, 'value');
      skipList.insert(undefined, 'valueundefined');
      skipList.delete(null);
      let layers = getLayerEntries(skipList);
      for (let layer of layers) {
        for (let [key, value] of layer) {
          assert(key !== null);
          assert(value !== 'value');
        }
      }
    });

    it('should continue to function after trying to delete an undefined key', async function () {
      skipList.delete(undefined);
      result = skipList.find(12);
      assert(result === 'value12');
    });
  });

  describe('#extract', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
      for (let i = 0; i < 20; i++) {
        skipList.insert(i, `value${i}`);
      }
    });

    it('should delete an entry from all layers and return the previous value', async function () {
      let oldValue = skipList.extract(11);
      assert(oldValue === 'value11');

      let layers = getLayerKeys(skipList);
      for (let layer of layers) {
        for (let key of layer) {
          assert(key != 11);
        }
      }
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
        assert(result === 3);
      });

      it('should be able to get the value at the lowest key', async function () {
        result = skipList.minValue();
        assert(result === 'value3');
      });

      it('should be able to get the entry at the lowest key', async function () {
        let entry = skipList.minEntry();
        assert(entry.length === 2);
        assert(entry[0] === 3);
        assert(entry[1] === 'value3');
      });
    });

    describe('when skip list is empty', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
      });

      it('should return [undefined, undefined] when minEntry is called', async function () {
        result = skipList.minEntry();
        assert(result.length === 2);
        assert(result[0] === undefined);
        assert(result[1] === undefined);
      });

      it('should return undefined when minKey is called', async function () {
        result = skipList.minKey();
        assert(result === undefined);
      });

      it('should return undefined when minValue is called', async function () {
        result = skipList.minValue();
        assert(result === undefined);
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
        assert(result === 999);
      });

      it('should be able to get the value at the highest key', async function () {
        result = skipList.maxValue();
        assert(result === 'value999');
      });
    });

    describe('when skip list is empty', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
      });

      it('should return [undefined, undefined] when maxEntry is called', async function () {
        result = skipList.maxEntry();
        assert(result.length === 2);
        assert(result[0] === undefined);
        assert(result[1] === undefined);
      });

      it('should return undefined when maxKey is called', async function () {
        result = skipList.maxKey();
        assert(result === undefined);
      });

      it('should return undefined when maxValue is called', async function () {
        result = skipList.maxValue();
        assert(result === undefined);
      });
    });
  });

  describe('#findEntries', function () {
    describe('when all entries are adjacent', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
        for (let i = 7; i < 107; i++) {
          skipList.insert(i, `value${i}`);
        }
      });

      it('should be able to iterate over entries in ascending order starting from the specified key', async function () {
        result = skipList.findEntries(37);
        assert(result.matchingValue === 'value37');
        let iterable = result.asc;
        let lastKey = -Infinity;
        for (let [key, value, i] of iterable) {
          if (i === 0) {
            assert(key === 37);
          }
          assert(key > lastKey);
          lastKey = key;
        }
        result = iterable.next();
        result = iterable.next();
        assert(JSON.stringify(result.value) === JSON.stringify([undefined, undefined, 70]));
      });

      it('should be able to iterate over entries in descending order starting from the specified key', async function () {
        result = skipList.findEntries(88);
        assert(result.matchingValue === 'value88');
        let iterable = result.desc;
        let lastKey = Infinity;
        let lastIndex;
        for (let [key, value, i] of iterable) {
          lastIndex = i;
          if (i === 0) {
            assert(key === 88);
          }
          assert(key < lastKey);
          lastKey = key;
        }
        assert(lastIndex === 81);
        result = iterable.next();
        assert(JSON.stringify(result.value) === JSON.stringify([undefined, undefined, 82]));
        result = iterable.next();
        assert(JSON.stringify(result.value) === JSON.stringify([undefined, undefined, 82]));
      });
    });

    describe('when there are gaps between entries', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
        for (let i = 10; i < 1000; i += 10) {
          skipList.insert(i, `value${i}`);
        }
      });

      it('should be able to iterate over nearby entries in ascending order even if the exact matching key cannot be found', async function () {
        result = skipList.findEntries(19);
        assert(result.matchingValue === undefined);
        let iterable = result.asc;
        let lastKey = -Infinity;
        for (let [key, value, i] of iterable) {
          if (i === 0) {
            assert(key === 20);
          }
          assert(key > lastKey);
          assert(key % 10 === 0);
          lastKey = key;
        }
      });

      it('should be able to iterate over nearby entries in descending order even if the exact matching key cannot be found', async function () {
        result = skipList.findEntries(89);
        assert(result.matchingValue === undefined);
        let iterable = result.desc;
        let lastKey = Infinity;
        for (let [key, value, i] of iterable) {
          if (i === 0) {
            assert(key === 80);
          }
          assert(key < lastKey);
          assert(key % 10 === 0);
          lastKey = key;
        }
      });
    });
  });

  describe('#findEntriesFromMin', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
      for (let i = 4; i < 100; i++) {
        skipList.insert(i, `value${i}`);
      }
    });

    it('should be able to iterate over entries starting from the minimum key', async function () {
      let iterable = skipList.findEntriesFromMin();
      let lastKey = -Infinity;
      for (let [key, value, i] of iterable) {
        if (i === 0) {
          assert(key === 4);
        }
        assert(key > lastKey);
        lastKey = key;
      }
      result = iterable.next();
      assert(JSON.stringify(result.value) === JSON.stringify([undefined, undefined, 96]));
      result = iterable.next();
      assert(JSON.stringify(result.value) === JSON.stringify([undefined, undefined, 96]));
    });
  });

  describe('#findEntriesFromMax', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
      for (let i = 4; i < 100; i++) {
        skipList.insert(i, `value${i}`);
      }
    });

    it('should be able to iterate over entries backwards starting from the maximum key', async function () {
      let iterable = skipList.findEntriesFromMax();
      let lastKey = Infinity;
      for (let [key, value, i] of iterable) {
        if (i === 0) {
          assert(key === 99);
        }
        assert(key < lastKey);
        lastKey = key;
      }
      result = iterable.next();
      assert(JSON.stringify(result.value) === JSON.stringify([undefined, undefined, 96]));
      result = iterable.next();
      assert(JSON.stringify(result.value) === JSON.stringify([undefined, undefined, 96]));
    });
  });
});
