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
  return getLayerEntries(skipList).map((layer) => layer.map((entry) => entry[0]));
}

function logLayerKeys(skipList) {
  let layers = getLayerEntries(skipList).map((layer) => layer.map((entry) => {
    let key = entry[0];
    if (typeof key === 'string') {
      return `"${key}"`;
    }
    return key;
  })).reverse();
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

  describe('#upsert', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
    });

    it('should insert numeric keys in sorted order inside the skip list', async function () {
      for (let i = 0; i < 100; i++) {
        skipList.upsert(i, `value${i}`);
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
        skipList.upsert(i, `value${i}`);
      }
      result = skipList.find(11);
      assert(result, 'value11');

      skipList.upsert(11, 'updated');

      result = skipList.find(11);
      assert(result, 'updated');
    });

    it('should have multiple layers of decreasing size', async function () {
      for (let i = 0; i < 1000; i++) {
        skipList.upsert(i, `value${i}`);
      }
      let layers = getLayerKeys(skipList);

      let len = layers.length;
      for (let i = 1; i < len; i++) {
        assert(layers[i].length <= layers[i - 1].length);
      }
    });

    it('should support inserting and updating values with strings as keys', async function () {
      for (let i = 0; i < 100; i++) {
        skipList.upsert(`key${i}`, `value${i}`);
      }
      result = skipList.find('key88');
      assert(result, 'value88');

      skipList.upsert('key88', 'updated');

      result = skipList.find('key88');
      assert(result, 'updated');
    });

    it('should store string keys based on lexicographical order', async function () {
      for (let i = 4; i >= 0; i--) {
        skipList.upsert(`key${i}`, `value${i}`);
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
        skipList.upsert(`key${i}`, `string${i}`);
      }
      for (let i = 2; i >= 0; i--) {
        skipList.upsert(i, `number${i}`);
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
      skipList.upsert(null, 'value1');
      skipList.upsert(undefined, 'value2');
      let layers = getLayerEntries(skipList);
      let bottomLayer = layers[0];
      assert(bottomLayer[1][0] === undefined);
      assert(bottomLayer[2][0] === null);
    });

    it('should support mixing null, undefined, strings and numbers as keys', async function () {
      skipList.upsert(undefined, '[undefined]');
      skipList.upsert(null, '[null]');
      skipList.upsert(3, 'number3');
      skipList.upsert(10, 'number10');
      skipList.upsert('3', 'string3');
      skipList.upsert('4', 'string4');
      skipList.upsert('hello', 'stringhello');
      skipList.upsert('test', 'stringtest');

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
          skipList.upsert(i, `value${i}`);
        }
        skipList.upsert('hello', 'world');
        skipList.upsert('foo', 'bar');
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
        skipList.upsert(i, `value${i}`);
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
      skipList.upsert(null, 'value');
      skipList.upsert(undefined, 'valueundefined');
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
      skipList.upsert(1000, 'testing');
      result = skipList.find(1000);
      assert(result === 'testing');
    });
  });

  describe('#extract', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
      for (let i = 0; i < 20; i++) {
        skipList.upsert(i, `value${i}`);
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
          skipList.upsert(i, `value${i}`);
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
          skipList.upsert(i, `value${i}`);
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
          skipList.upsert(i, `value${i}`);
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
          skipList.upsert(i, `value${i}`);
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

    describe('when strings are used as keys', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
        for (let i = 10; i < 1000; i += 10) {
          skipList.upsert(`key${i}`, `value${i}`);
        }
      });

      it('should be able to iterate over nearby entries in ascending order even if the exact matching key cannot be found', async function () {
        result = skipList.findEntries('key15');
        assert(result.matchingValue === undefined);
        let iterable = result.asc;
        let lastKey = '';
        for (let [key, value, i] of iterable) {
          if (i === 0) {
            assert(key === 'key150');
          }
          assert(key > lastKey);
          lastKey = key;
        }
      });

      it('should be able to iterate over nearby entries in descending order even if the exact matching key cannot be found', async function () {
        result = skipList.findEntries('key89');
        assert(result.matchingValue === undefined);
        let iterable = result.desc;
        let lastKey = 'z';
        for (let [key, value, i] of iterable) {
          if (i === 0) {
            assert(key === 'key880');
          }
          assert(key < lastKey);
          lastKey = key;
        }
      });
    });
  });

  describe('#findEntriesFromMin', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
      for (let i = 4; i < 100; i++) {
        skipList.upsert(i, `value${i}`);
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
        skipList.upsert(i, `value${i}`);
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

  describe('#deleteRange', function () {
    let keyLookup;

    describe('when numeric keys are used', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
        keyLookup = {};
        for (let i = 0; i < 50; i++) {
          skipList.upsert(i, `value${i}`);
          keyLookup[i] = true;
        }
      });

      it('should be able to remove an entire range of entries in a single operation but keep both the left and right bounds', async function () {
        skipList.deleteRange(10, 20);

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key <= 10 || key >= 20 || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          key = Number(key);
          if (key <= 10 || key >= 20) {
            assert(skipList.has(key));
          }
        });
      });

      it('should delete range to the end if the second argument is missing or null', async function () {
        skipList.deleteRange(10);

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key <= 10 || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          key = Number(key);
          if (key <= 10) {
            assert(skipList.has(key));
          }
        });
      });

      it('should delete range from the beginning if the first argument is null', async function () {
        skipList.deleteRange(null, 10);

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key >= 10 || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          key = Number(key);
          if (key >= 10) {
            assert(skipList.has(key));
          }
        });
      });

      it('should delete everything if all arguments are undefined', async function () {
        skipList.deleteRange();

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key === undefined);
          }
        }
      });

      it('should be able to remove an entire range of entries in a single operation but keep both the left and right bounds', async function () {
        skipList.deleteRange(10, 20);

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key <= 10 || key >= 20 || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          key = Number(key);
          if (key <= 10 || key >= 20) {
            assert(skipList.has(key));
          }
        });
      });

      it('should be able to remove an entire range of entries in a single operation including the left bound', async function () {
        skipList.deleteRange(10, 20, true);

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key < 10 || key >= 20 || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          key = Number(key);
          if (key < 10 || key >= 20) {
            assert(skipList.has(key));
          }
        });
      });

      it('should be able to remove an entire range of entries in a single operation including the right bound', async function () {
        skipList.deleteRange(10, 20, false, true);

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key <= 10 || key > 20 || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          key = Number(key);
          if (key <= 10 || key > 20) {
            assert(skipList.has(key));
          }
        });
      });

      it('should be able to remove an entire range of entries in a single operation including both the left and right bounds', async function () {
        skipList.deleteRange(10, 20, true, true);

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key < 10 || key > 20 || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          key = Number(key);
          if (key < 10 || key > 20) {
            assert(skipList.has(key));
          }
        });
      });

      it('should be able to remove an entire range of entries in a single operation even if there are no exact matches for the left and right bounds', async function () {
        skipList.deleteRange(10.5, 19.5);

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key <= 10 || key >= 20 || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          key = Number(key);
          if (key <= 10 || key >= 20) {
            assert(skipList.has(key));
          }
        });
      });
    });

    describe('when string keys are used', function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
        keyLookup = {};
        for (let i = 0; i < 50; i++) {
          let key = `key${i}`;
          skipList.upsert(key, `value${i}`);
          keyLookup[key] = true;
        }
      });

      it('should be able to remove an entire range of entries in a single operation but keep both the left and right bounds', async function () {
        skipList.deleteRange('key10', 'key20');

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key <= 'key10' || key >= 'key20' || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          if (key <= 'key10' || key >= 'key20') {
            assert(skipList.has(key));
          }
        });
      });

      it('should be able to remove an entire range of entries in a single operation including both the left and right bounds', async function () {
        skipList.deleteRange('key10', 'key20', true, true);

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key < 'key10' || key > 'key20' || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          if (key < 'key10' || key > 'key20') {
            assert(skipList.has(key));
          }
        });
      });

      it('should be able to remove an entire range of entries in a single operation even if there are no exact matches for the left and right bounds', async function () {
        // Insert elements which are lexicographically between (key10 and key11) and between (key19 and key20).
        skipList.deleteRange('key10a', 'key19a');

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            assert(key <= 'key10' || key >= 'key2' || key === undefined);
          }
        }

        Object.keys(keyLookup).forEach((key) => {
          if (key <= 'key10' || key >= 'key2') {
            assert(skipList.has(key));
          }
        });
      });
    });

    describe('when numeric and string keys are used together', function () {
      let numberKeyLookup;
      let stringKeyLookup;
      beforeEach(async function () {
        skipList = new ProperSkipList();
        numberKeyLookup = {};
        stringKeyLookup = {};
        for (let i = 0; i < 50; i++) {
          skipList.upsert(i, `value${i}`);
          numberKeyLookup[i] = true;
        }
        for (let i = 0; i < 50; i++) {
          let key = `key${i}`;
          skipList.upsert(key, `value${i}`);
          stringKeyLookup[key] = true;
        }
      });

      it('should be able to delete a range across type boundaries', async function () {
        // Insert elements which are lexicographically between (key10 and key11) and between (key19 and key20).
        skipList.deleteRange(10, 'key40');

        let layers = getLayerKeys(skipList);
        for (let layer of layers) {
          for (let key of layer) {
            let isString = isNaN(key);
            if (isString) {
              assert(key >= 'key40' || key === undefined);
            } else {
              assert(key <= 10 || key === undefined);
            }
          }
        }

        Object.keys(numberKeyLookup).forEach((key) => {
          key = Number(key);
          if (key <= 10) {
            assert(skipList.has(key));
          }
        });

        Object.keys(stringKeyLookup).forEach((key) => {
          if (key >= 'key40') {
            assert(skipList.has(key));
          }
        });
      });
    });
  });

  describe('#clear', function () {
    beforeEach(async function () {
      skipList = new ProperSkipList();
      for (let i = 0; i < 50; i++) {
        skipList.upsert(i, `value${i}`);
      }
    });

    it('should continue working after clear is called', async function () {
      skipList.clear();
      for (let i = 0; i < 50; i++) {
        skipList.upsert(i, `value${i}`);
      }
      result = skipList.find(10);
      assert(result === 'value10');
    });
  });

  describe('#length', function () {
    describe('when default settings are used', async function () {
      beforeEach(async function () {
        skipList = new ProperSkipList();
        for (let i = 0; i < 50; i++) {
          skipList.upsert(i, `value${i}`);
        }
      });

      it('should show the correct number of entries after elements are inserted', async function () {
        assert(skipList.length === 50);
        skipList.upsert('hello', 1);
        assert(skipList.length === 51);
        skipList.upsert('foo', 'bar');
        assert(skipList.length === 52);
        skipList.upsert(null, 'bar');
        assert(skipList.length === 53);
        skipList.upsert('foo', 'two');
        assert(skipList.length === 53);
        skipList.upsert(null, 'test');
        assert(skipList.length === 53);
      });

      it('should show the correct number of entries after elements are deleted', async function () {
        skipList.delete(10);
        assert(skipList.length === 49);
        skipList.delete(100);
        assert(skipList.length === 49);
        skipList.delete(undefined);
        assert(skipList.length === 49);
        skipList.delete(null);
        assert(skipList.length === 49);
      });

      it('should show the correct number of entries after ranges are deleted', async function () {
        skipList.deleteRange(10, 20);
        assert(skipList.length === 41);
        skipList.deleteRange(40, 50);
        assert(skipList.length === 32);
        skipList.deleteRange();
        assert(skipList.length === 0);
      });

      it('should reset length to 0 after clear is invoked', async function () {
        skipList.clear();
        assert(skipList.length === 0);
      });
    });

    describe('when updateLength is false', async function () {
      beforeEach(async function () {
        skipList = new ProperSkipList({
          updateLength: false
        });
        for (let i = 0; i < 50; i++) {
          skipList.upsert(i, `value${i}`);
        }
      });

      it('should show the length as undefined', async function () {
        assert(skipList.length === undefined);
      });

      it('should stay as undefined when different methods are called', async function () {
        skipList.deleteRange(10, 20);
        assert(skipList.length === undefined);
        skipList.delete(2);
        assert(skipList.length === undefined);
        skipList.clear();
        assert(skipList.length === undefined);
      });
    });
  });
});
