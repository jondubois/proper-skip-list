const DEFAULT_STACK_UP_PROBABILITY = 0.5;

class SkipList {

  constructor(options) {
    options = options || {};
    this.stackUpProbability = options.stackUpProbability || DEFAULT_STACK_UP_PROBABILITY;
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
    this.typePriorityMap = {
      'undefined': 0,
      'object': 1,
      'number': 2,
      'bigint': 2,
      'string': 3
    };
    headNode.next = tailNode;
    tailNode.prev = headNode;
    headNode.group = this.head;
    tailNode.group = this.tail;
  }

  insert(key, value) {
    let {matchingNode, prevNode, searchPath} = this._search(key);
    if (matchingNode) {
      matchingNode.group.value = value;
      return;
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
  }

  find(key) {
    let {matchingNode} = this._search(key);
    return matchingNode ? matchingNode.group.value : undefined;
  }

  _isAGreaterThanB(a, b) {
    let typeA = typeof a;
    let typeB = typeof b;
    if (typeA === typeB) {
      return a > b;
    }
    return this.typePriorityMap[typeA] > this.typePriorityMap[typeB];
  }

  _search(key) {
    let searchPath = [];
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

  extract(key) {
    let {matchingNode} = this._search(key);
    if (matchingNode) {
      let nodes = matchingNode.group.nodes;
      for (let layerNode of nodes) {
        let prevNode = layerNode.prev;
        prevNode.next = layerNode.next;
        prevNode.next.prev = prevNode;
      }
    }
    return matchingNode ? matchingNode.group.value : undefined;
  }

  delete(key) {
    return this.extract(key) !== undefined;
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

  deleteSegment(fromKey, toKey, excludeFirst, excludeLast) {
    let {prevNode: fromNode} = this._search(fromKey);
    let {prevNode: toNode} = this._search(toKey);
    let newStartNode = excludeFirst ? fromNode.next : fromNode;
    let newEndNode = excludeLast ? toNode.next : toNode.next.next;
    if (!newEndNode) {
      newEndNode = toNode.next;
    }
    newStartNode.next = newEndNode;
    newEndNode.prev = newStartNode;
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

module.exports = SkipList;
