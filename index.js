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
      key: -Infinity,
      value: undefined,
      nodes: [headNode]
    };
    this.tail = {
      isTail: true,
      key: Infinity,
      value: undefined,
      nodes: [tailNode]
    };

    headNode.next = tailNode;
    tailNode.prev = headNode;
    headNode.group = this.head;
    tailNode.group = this.tail;
  }

  insert(key, value) {
    let {matchingNode, lastVisitedNode, searchPath} = this.search(key);
    if (matchingNode) {
      matchingNode.group.value = value;
      return;
    }

    // Insert the entry.
    let newNode = {
      prev: lastVisitedNode,
      next: lastVisitedNode.next
    };
    let newGroup = {
      key,
      value,
      nodes: [newNode]
    };
    newNode.group = newGroup;
    lastVisitedNode.next = newNode;
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
    let matchingNode = this.findNode(key);
    return matchingNode === undefined ? undefined : matchingNode.group.value;
  }

  minNode() {
    let minNode = this.head.nodes[0].next;
    if (minNode.group.isTail) {
      minNode = this.head.nodes[0];
    }
    return minNode;
  }

  maxNode() {
    let maxNode = this.tail.nodes[0].prev;
    if (maxNode.group.isHead) {
      maxNode = this.tail.nodes[0];
    }
    return maxNode;
  }

  minKey() {
    return this.minNode().group.key;
  }

  maxKey() {
    return this.maxNode().group.key;
  }

  minValue() {
    return this.minNode().group.value;
  }

  maxValue() {
    return this.maxNode().group.value;
  }

  delete(key) {
    return this.extract(key) !== undefined;
  }

  findNode(key) {
    return this.search(key).matchingNode;
  }

  findSegment(key, countBefore, countAfter) {
    let segmentNodes = this._findSegmentNodes(key, countBefore, countAfter);
    return {
      before: segmentNodes.before.map((node) => node.group.value),
      match: segmentNodes.match.group.value,
      after: segmentNodes.after.map((node) => node.group.value)
    };
  }

  deleteSegment(key, countBefore, countAfter) {
    let segmentNodes = this._findSegmentNodes(key, countBefore, countAfter);
    let firstNode = segmentNodes.before[segmentNodes.before.length - 1];
    let lastNode = segmentNodes.after[segmentNodes.after.length - 1];
    firstNode.prev.next = lastNode.next;
    lastNode.next.prev = firstNode.prev;
    return {
      beforeCount: segmentNodes.before.length,
      match: segmentNodes.match !== undefined,
      after: segmentNodes.after.length
    };
  }

  extract(key) {
    let extractedNode = this.extractNode(key);
    return extractedNode === undefined ? undefined : extractedNode.group.value;
  }

  extractNode(key) {
    let {matchingNode} = this.search(key);
    if (matchingNode) {
      let prevNode = matchingNode.prev;
      prevNode.next = matchingNode.next;
      prevNode.next.prev = prevNode;
    }
    return matchingNode;
  }

  extractSegment(key, countBefore, countAfter) {
    let segmentNodes = this._findSegmentNodes(key, countBefore, countAfter);
    let firstNode = segmentNodes.before[segmentNodes.before.length - 1];
    let lastNode = segmentNodes.after[segmentNodes.after.length - 1];
    firstNode.prev.next = lastNode.next;
    lastNode.next.prev = firstNode.prev;
    return {
      before: segmentNodes.before.map((node) => node.group.value),
      match: segmentNodes.match.group.value,
      after: segmentNodes.after.map((node) => node.group.value)
    };
  }

  search(key) {
    let searchPath = [];
    let layerIndex = this.head.nodes.length - 1;
    let currentNode = this.head.nodes[layerIndex];
    let lastVisitedNode = currentNode;
    let goToNextLayer = false;

    while (true) {
      let currentNodeGroup = currentNode.group;
      if (key > currentNodeGroup.key || currentNodeGroup.isHead) {
        lastVisitedNode = currentNode;
        currentNode = currentNode.next;
        continue;
      }
      if (key == currentNodeGroup.key) {
        let keyType = typeof key;
        let currentNodeGroupKeyType = typeof currentNodeGroup.key;
         if (keyType === currentNodeGroupKeyType) {
           let matchingNode = currentNodeGroup.nodes[0];
           return {matchingNode, lastVisitedNode, searchPath};
         } else if (keyType !== 'number') {
           lastVisitedNode = currentNode;
           currentNode = currentNode.next;
           continue;
         }
      }
      searchPath[layerIndex] = lastVisitedNode;
      if (--layerIndex < 0) {
        return {matchingNode: undefined, lastVisitedNode, searchPath};
      }
      currentNode = lastVisitedNode.group.nodes[layerIndex];
    }
  }

  _findSegmentNodes(key, countBefore, countAfter) {
    let matchingNode = this.findNode(key);
    let segment = {
      before: [],
      match: matchingNode,
      after: []
    };
    let currentNode = matchingNode;
    for (let i = 0; i < countBefore; i++) {
      currentNode = currentNode.prev;
      segment.before.push(currentNode);
    }
    currentNode = matchingNode;
    for (let i = 0; i < countAfter; i++) {
      currentNode = currentNode.next;
      segment.after.push(currentNode);
    }
    return segment;
  }
}

module.exports = SkipList;
