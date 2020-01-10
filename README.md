# proper-skip-list
A fast skip list implementation which supports fetching and deleting multiple adjacent entries at a time.

## Installation

```bash
npm install proper-skip-list --save
```

## Performance

### Time complexity

Average case, relative to the total number of elements in the list:

- **insert**: `O(log n)`
- **find**: `O(log n)`
- **has**: `O(log n)`
- **extract**: `O(log n)`
- **delete**: `O(log n)`
- **findEntries**: `O(log n)`
- **minKey**: `O(1)`
- **maxKey**: `O(1)`
- **minValue**: `O(1)`
- **maxValue**: `O(1)`
- **findEntriesFromMin**: `O(1)`
- **findEntriesFromMax**: `O(1)`
- **deleteSegment**: `O(log n)`
- **clear**: `O(1)`
- **get length**: `O(1)`

Note that the **deleteSegment** method is `O(log n)` relative to the number of elements in the list.
The time complexity relative to the number of elements which will be removed from the list is different and it varies depending on whether the `updateLength` constructor option is `true` or `false`. If `true`, time complexity is `O(n)`, if `false`, it is `O(1)`.

### Space complexity

- Average: `O(n)`
- Worst case: `O(n log n)`

The `stackUpProbability` option can be modified to optimize space usage and performance to suit more advanced use cases but it should be used cautiously.

## API

Keys can be of type `string` and/or `number`. Internally, different types are handled separately. All numbers have priority over strings.
If strings are used, the order is lexicographic.

### Constructor

```js
const ProperSkipList = require('proper-skip-list');

// Default options:
let skipList = new ProperSkipList();

// Or...

// Sample custom options:
let skipList = new ProperSkipList({
  stackUpProbability: 0.5, // 0.25 by default
  updateLength: false // true by default
});
```

- The `stackUpProbability` option is the probability of an entry stacking up a single level when it is inserted into the skip list.
- The `updateLength` option allows you to disable the `length` property of the skip list. Not updating the `length` of the skip list can make the `deleteSegment` method faster for certain use cases which involve deleting large segments of the skip list in a single operation.

### Methods

- **`insert(key, value)`**: Insert a value into the skip list at the specified key. If a value already exists at that key, it will be replaced.
- **`find(key)`**: Get the value stored at the specified key. This method returns `undefined` if a matching value is not found.
- **`has(key)`**: Check if an entry with the specified key exists.
- **`extract(key)`**: Remove a value at the specified key if it exits. This method returns the value or `undefined` if not found.
- **`delete(key)`**: Remove a value at the specified key if it exits. This method returns a boolean to indicate whether or not a value existed at that key.
- **`findEntries(fromKey)`**: Get iterators for entries starting at the specified key in ascending or descending order. The `fromKey` does not need to have an exact match in the list; this method can therefore be used to iterate over nearby keys. The return value is an object in the form `{matchingValue, asc, desc}`. If an exact match for `fromKey` was found, the `matchingValue` property will contain the value at that key, otherwise it will be `undefined`. The `asc` property is an `iterable` iterator which can be used to iterate over records in ascending order starting at `fromKey` (or the next highest value if no exact match is found). The `desc` property is an `iterable` iterator which can be used to iterate over records in descending order starting at `fromKey` (or the next lowest value if no exact match is found).
- **`findEntriesFromMin()`**: Iterate over entries in ascending order starting at the lowest key. This method returns an iterable iterator.
- **`findEntriesFromMax()`**: Iterate over entries in descending order starting at the highest key. This method returns an iterable iterator.
- **`minKey()`**: Get the lowest key in the list.
- **`maxKey()`**: Get the highest key in the list.
- **`minValue()`**: Get the value stored at the lowest key in the list.
- **`maxValue()`**: Get the value stored at the highest key in the list.
- **`deleteSegment(fromKey, toKey, deleteLeft, deleteRight)`**: Delete multiple keys with a single operation. The `fromKey` argument specifies the starting key in the range does not need to have an exact match in the list. The `toKey` argument is the end key, it also does not need to have an exact match. The `deleteLeft` argument can be used to specify whether or not the value at `fromKey` should also be deleted if found. The `deleteRight` argument argument can be used to specify whether or not the value at `toKey` should also be deleted if found. By default, only the in-between values will be deleted. If `fromKey` is null, it will delete from the beginning of the skip list. If `fromKey` is null, it will delete until the end of the skip list.
- **`clear`**: Empty/reset the skip list.

### Properties

Note that most of these properties were intended to be read-only.

- **`length`**: The number of entries stored in the skip list. It will be `undefined` if the `updateLength` constructor option is `false`.
- **`stackUpProbability`**: The probability of an entry stacking up a single level when it is inserted into the skip list.
- **`updateLength`**: Whether or not the length property is being updated.
- **`head`**: The head group of the skip list which holds an array of head nodes. This can be used to traverse all layers of the skip list for more advanced use cases.
- **`tail`**: The tail group of the skip list which holds an array of tail nodes. This can be used to traverse all layers of the skip list for more advanced use cases.

### Iterators

Iterators returned by methods like `findEntries`, `findEntriesFromMin` and `findEntriesFromMax` are iterable and can be looped over like this (example):

```js
let {asc, desc} = this.findEntries(1234);
for (let [key, value, i] of asc) {

  // ... Do something.

  if (i > 100) break;
}
```

Alternatively, `asc.next()` could be called manually from inside a `while` loop.
