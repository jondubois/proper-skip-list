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
    return matchingNode == null ? undefined : matchingNode.group.value;
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

  _createIteratorFromMin() {
    let currentNode = this.head.nodes[0];
    return {
      next: () => {
        currentNode = currentNode.next;
        let currentGroup = currentNode.group;
        return {
          key: currentGroup.key,
          value: currentGroup.value,
          done: currentGroup.isTail
        };
      }
    };
  }

  _createIteratorFromMax() {
    let currentNode = this.tail.nodes[0];
    return {
      next: () => {
        currentNode = currentNode.prev;
        let currentGroup = currentNode.group;
        return {
          key: currentGroup.key,
          value: currentGroup.value,
          done: currentGroup.isHead
        };
      }
    };
  }

  findEntriesFromMin() {
    return {
      [Symbol.iterator]: () => {
        let iterator = this._createIteratorFromMin();
        return {
          next: () => {
            let item = iterator.next();
            return {
              value: [item.key, item.value],
              done: item.done
            };
          }
        };
      }
    };
  }

  findEntriesFromMax() {
    return {
      [Symbol.iterator]: () => {
        let iterator = this._createIteratorFromMax();
        return {
          next: () => {
            let item = iterator.next();
            return {
              value: [item.key, item.value],
              done: item.done
            };
          }
        };
      }
    };
  }

  minEntry() {
    let minIterator = this._createIteratorFromMin();
    let item = minIterator.next();
    return [item.key, item.value];
  }

  maxEntry() {
    let minIterator = this._createIteratorFromMax();
    let item = minIterator.next();
    return [item.key, item.value];
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
    return matchingNode == null ? undefined : matchingNode.group.value;
  }

  delete(key) {
    return this.extract(key) !== undefined;
  }

  findEntries(fromKey) {
    let {matchingNode, prevNode} = this._search(fromKey);
    return {
      matchingValue: matchingNode == null ? undefined : matchingNode.group.value,
      asc: {
        [Symbol.iterator]: () => {
          let currentNode = prevNode;
          return {
            next: () => {
              currentNode = currentNode.next;
              let currentGroup = currentNode.group;
              return {
                value: [currentGroup.key, currentGroup.value],
                done: currentGroup.isTail
              };
            }
          };
        }
      },
      desc: {
        [Symbol.iterator]: () => {
          let currentNode = prevNode.next;
          return {
            next: () => {
              currentNode = currentNode.prev;
              let currentGroup = currentNode.group;
              return {
                value: [currentGroup.key, currentGroup.value],
                done: currentGroup.isTail
              };
            }
          };
        }
      }
    };
  }

  deleteSegment(fromKey, toKey, excludeFirst, excludeLast) {
    let {prevNode: fromNode} = this._search(fromKey);
    let {prevNode: toNode} = this._search(toKey);
    let newStartNode = excludeFirst ? fromNode.next : fromNode;
    let newEndNode = excludeLast ? toNode.next : toNode.next.next;
    if (newEndNode == null) {
      newEndNode = toNode.next;
    }
    newStartNode.next = newEndNode;
    newEndNode.prev = newStartNode;
  }
}

module.exports = SkipList;
