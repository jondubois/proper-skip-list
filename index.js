const DEFAULT_STACK_UP_PROBABILITY = 0.25;
const SUPPORTED_KEYS_MESSAGE = 'only undefined, null, number, bigint, string and boolean keys are supported';

class ProperSkipList {
  constructor(options) {
    options = options || {};
    this.stackUpProbability = options.stackUpProbability == null ?
      DEFAULT_STACK_UP_PROBABILITY : options.stackUpProbability;
    // A probability of 1 or more would make the stack up loop in upsert run
    // forever since Math.random() always returns a value which is less than 1.
    if (
      typeof this.stackUpProbability !== 'number' ||
      !(this.stackUpProbability > 0) ||
      this.stackUpProbability >= 1
    ) {
      throw new TypeError(
        'The stackUpProbability option must be a number greater than 0 and less than 1'
      );
    }
    this.updateLength = options.updateLength !== false;
    this.typePriorityMap = {
      'undefined': 0,
      'object': 1,
      'number': 2,
      'bigint': 2,
      'string': 3
    };
    this.clear();
  }

  clear() {
    let headNode = {
      prev: null
    };
    let tailNode = {
      next: null
    };
    this.head = {
      isHead: true,
      key: undefined,
      value: undefined,
      nodes: [headNode]
    };
    this.tail = {
      isTail: true,
      key: undefined,
      value: undefined,
      nodes: [tailNode]
    };
    headNode.next = tailNode;
    tailNode.prev = headNode;
    headNode.group = this.head;
    tailNode.group = this.tail;
    this.length = this.updateLength ? 0 : undefined;
  }

  upsert(key, value) {
    key = this._normalizeKey(key);
    let {matchingNode, prevNode, searchPath} = this._searchAndTrack(key);
    if (matchingNode) {
      let previousValue = matchingNode.group.value;
      matchingNode.group.value = value;
      return previousValue;
    }

    // Insert the entry.
    let newNode = {
      prev: prevNode,
      next: prevNode.next
    };
    let newGroup = {
      key,
      value,
      nodes: [newNode]
    };
    newNode.group = newGroup;
    prevNode.next = newNode;
    newNode.next.prev = newNode;

    // Stack up the entry for fast search.
    let layerIndex = 1;
    while (Math.random() < this.stackUpProbability) {
      let prevLayerNode = searchPath[layerIndex];
      if (!prevLayerNode) {
        let newHeadNode = {
          prev: null,
          group: this.head
        };
        let newTailNode = {
          next: null,
          group: this.tail
        };
        newHeadNode.next = newTailNode;
        this.head.nodes.push(newHeadNode);
        newTailNode.prev = newHeadNode;
        this.tail.nodes.push(newTailNode);
        prevLayerNode = newHeadNode;
      }
      let newNode = {
        prev: prevLayerNode,
        next: prevLayerNode.next,
        group: newGroup
      };
      prevLayerNode.next = newNode;
      newNode.next.prev = newNode;
      newGroup.nodes.push(newNode);
      layerIndex++;
    }
    if (this.updateLength) this.length++;

    return undefined;
  }

  find(key) {
    let {matchingNode} = this._search(key);
    return matchingNode ? matchingNode.group.value : undefined;
  }

  has(key) {
    let {matchingNode} = this._search(key);
    return !!matchingNode;
  }

  // Returns the key to use internally; throws if the key cannot be ordered.
  // It is idempotent so it is safe to apply more than once per operation.
  _normalizeKey(key) {
    let type = typeof key;
    if (type === 'boolean') {
      // Booleans are cast to strings so that they can be ordered; this means
      // that true and 'true' refer to the same entry.
      return String(key);
    }
    if (type === 'object') {
      // null is ordered as an object but any other object would have to be
      // compared via its valueOf/toString methods.
      if (key !== null) {
        throw new TypeError(
          `The specified key was an object; ${SUPPORTED_KEYS_MESSAGE}`
        );
      }
      return key;
    }
    if (this.typePriorityMap[type] === undefined) {
      throw new TypeError(
        `The specified key was of type ${type}; ${SUPPORTED_KEYS_MESSAGE}`
      );
    }
    // NaN is a number but it does not compare as greater than, less than or
    // equal to anything, including itself.
    if (type === 'number' && key !== key) {
      throw new TypeError(
        `The specified key was NaN which cannot be ordered; ${SUPPORTED_KEYS_MESSAGE}`
      );
    }
    return key;
  }

  _isAGreaterThanB(a, b) {
    let typeA = typeof a;
    let typeB = typeof b;
    if (typeA === typeB) {
      return a > b;
    }
    let typeAPriority = this.typePriorityMap[typeA];
    let typeBPriority = this.typePriorityMap[typeB];
    if (typeAPriority === typeBPriority) {
      return a > b;
    }
    return typeAPriority > typeBPriority;
  }

  // The two search methods are similar but were separated for performance reasons.
  _searchAndTrack(key) {
    key = this._normalizeKey(key);
    let layerCount = this.head.nodes.length;
    let searchPath = new Array(layerCount);
    let layerIndex = layerCount - 1;
    let currentNode = this.head.nodes[layerIndex];
    let prevNode = currentNode;

    while (true) {
      let currentNodeGroup = currentNode.group;
      let currentKey = currentNodeGroup.key;
      if (!currentNodeGroup.isTail) {
        if (this._isAGreaterThanB(key, currentKey) || currentNodeGroup.isHead) {
          prevNode = currentNode;
          currentNode = currentNode.next;
          continue;
        }
        if (key === currentKey) {
          let matchingNode = currentNodeGroup.nodes[0];
          searchPath[layerIndex] = matchingNode;
          return {matchingNode, prevNode: matchingNode.prev, searchPath};
        }
      }
      searchPath[layerIndex] = prevNode;
      if (--layerIndex < 0) {
        return {matchingNode: undefined, prevNode, searchPath};
      }
      currentNode = prevNode.group.nodes[layerIndex];
    }
  }

  _search(key) {
    key = this._normalizeKey(key);
    let layerIndex = this.head.nodes.length - 1;
    let currentNode = this.head.nodes[layerIndex];
    let prevNode = currentNode;
    while (true) {
      let currentNodeGroup = currentNode.group;
      let currentKey = currentNodeGroup.key;
      if (!currentNodeGroup.isTail) {
        if (this._isAGreaterThanB(key, currentKey) || currentNodeGroup.isHead) {
          prevNode = currentNode;
          currentNode = currentNode.next;
          continue;
        }
        if (key === currentKey) {
          let matchingNode = currentNodeGroup.nodes[0];
          return {matchingNode, prevNode: matchingNode.prev};
        }
      }
      if (--layerIndex < 0) {
        return {matchingNode: undefined, prevNode};
      }
      currentNode = prevNode.group.nodes[layerIndex];
    }
  }

  findEntriesFromMin() {
    return this._createEntriesIteratorAsc(this.head.nodes[0].next);
  }

  findEntriesFromMax() {
    return this._createEntriesIteratorDesc(this.tail.nodes[0].prev);
  }

  minEntry() {
    let [key, value] = this.findEntriesFromMin().next().value;
    return [key, value];
  }

  maxEntry() {
    let [key, value] = this.findEntriesFromMax().next().value;
    return [key, value];
  }

  minKey() {
    return this.minEntry()[0];
  }

  maxKey() {
    return this.maxEntry()[0];
  }

  minValue() {
    return this.minEntry()[1];
  }

  maxValue() {
    return this.maxEntry()[1];
  }

  _extractNode(matchingNode) {
    let nodes = matchingNode.group.nodes;
    for (let layerNode of nodes) {
      let prevNode = layerNode.prev;
      prevNode.next = layerNode.next;
      prevNode.next.prev = prevNode;
    }
    if (this.updateLength) this.length--;
    return matchingNode.group.value;
  }

  extract(key) {
    let {matchingNode} = this._search(key);
    if (matchingNode) {
      return this._extractNode(matchingNode);
    }
    return undefined;
  }

  delete(key) {
    let {matchingNode} = this._search(key);
    if (matchingNode) {
      this._extractNode(matchingNode);
      return true;
    }
    return false;
  }

  findEntries(fromKey) {
    let {matchingNode, prevNode} = this._search(fromKey);
    if (matchingNode) {
      return {
        matchingValue: matchingNode.group.value,
        asc: this._createEntriesIteratorAsc(matchingNode),
        desc: this._createEntriesIteratorDesc(matchingNode)
      };
    }
    return {
      matchingValue: undefined,
      asc: this._createEntriesIteratorAsc(prevNode.next),
      desc: this._createEntriesIteratorDesc(prevNode)
    };
  }

  deleteRange(fromKey, toKey, deleteLeft, deleteRight) {
    if (fromKey == null) {
      fromKey = this.minKey();
      deleteLeft = true;
    }
    if (toKey == null) {
      toKey = this.maxKey();
      deleteRight = true;
    }
    fromKey = this._normalizeKey(fromKey);
    toKey = this._normalizeKey(toKey);
    if (this._isAGreaterThanB(fromKey, toKey)) {
      return;
    }
    let {prevNode: fromNode, searchPath: leftSearchPath, matchingNode: matchingLeftNode} = this._searchAndTrack(fromKey);
    let {prevNode: toNode, searchPath: rightSearchPath, matchingNode: matchingRightNode} = this._searchAndTrack(toKey);
    let leftNode = matchingLeftNode ? matchingLeftNode : fromNode;
    let rightNode = matchingRightNode ? matchingRightNode : toNode.next;

    if (leftNode === rightNode) {
      if (deleteLeft) {
        this._extractNode(leftNode);
      }
      return;
    }

    if (this.updateLength) {
      let currentNode = leftNode;
      while (currentNode && currentNode.next !== rightNode) {
        this.length--;
        currentNode = currentNode.next;
      }
    }

    let leftGroupNodes = leftNode.group.nodes;
    let rightGroupNodes = rightNode.group.nodes;
    let layerCount = this.head.nodes.length;

    for (let layerIndex = 0; layerIndex < layerCount; layerIndex++) {
      let layerLeftNode = leftGroupNodes[layerIndex];
      let layerRightNode = rightGroupNodes[layerIndex];

      if (layerLeftNode && layerRightNode) {
        layerLeftNode.next = layerRightNode;
        layerRightNode.prev = layerLeftNode;
        continue;
      }
      if (layerLeftNode) {
        let layerRightmostNode = rightSearchPath[layerIndex];
        if (!layerRightmostNode.group.isTail) {
          layerRightmostNode = layerRightmostNode.next;
        }
        layerLeftNode.next = layerRightmostNode;
        layerRightmostNode.prev = layerLeftNode;
        continue;
      }
      if (layerRightNode) {
        let layerLeftmostNode = leftSearchPath[layerIndex];
        layerLeftmostNode.next = layerRightNode;
        layerRightNode.prev = layerLeftmostNode;
        continue;
      }
      // If neither left nor right nodes are present on the layer, connect based
      // on search path to remove in-between entries.
      let layerRightmostNode = rightSearchPath[layerIndex];
      if (!layerRightmostNode.group.isTail) {
        layerRightmostNode = layerRightmostNode.next;
      }
      let layerLeftmostNode = leftSearchPath[layerIndex];
      layerLeftmostNode.next = layerRightmostNode;
      layerRightmostNode.prev = layerLeftmostNode;
    }
    if (deleteLeft && matchingLeftNode) {
      this._extractNode(matchingLeftNode);
    }
    if (deleteRight && matchingRightNode) {
      this._extractNode(matchingRightNode);
    }
  }

  _createEntriesIteratorAsc(currentNode) {
    let i = 0;
    return {
      next: function () {
        let currentGroup = currentNode.group;
        if (currentGroup.isTail) {
          return {
            value: [currentNode.key, currentNode.value, i],
            done: true
          }
        }
        currentNode = currentNode.next;
        return {
          value: [currentGroup.key, currentGroup.value, i++],
          done: currentGroup.isTail
        };
      },
      [Symbol.iterator]: function () { return this; }
    };
  }

  _createEntriesIteratorDesc(currentNode) {
    let i = 0;
    return {
      next: function () {
        let currentGroup = currentNode.group;
        if (currentGroup.isHead) {
          return {
            value: [currentNode.key, currentNode.value, i],
            done: true
          }
        }
        currentNode = currentNode.prev;
        return {
          value: [currentGroup.key, currentGroup.value, i++],
          done: currentGroup.isHead
        };
      },
      [Symbol.iterator]: function () { return this; }
    };
  }
}

module.exports = ProperSkipList;
