## PS API Objects

### Menu Command

```javascript
{
    "command": 10,
    "menuID": 0,
    "title": "New...",
    "name": "New",
    "visible": true,
    "enabled": true,
    "checked": false,
    "kind": "item",
    "menuShortcut": {
        "shiftKey": false,
        "commandKey": true,
        "optionKey": false,
        "controlKey": false,
        "keyChar": "N"
    }
}
```

### Action

```javascript
{
    _id: number,
    id: number,
    index: number,
    name: string,
    parent: {
        _id: number,
        actions: Array.<object>,
        id: number,
        index: number,
        name: string,
        typename: string
    },
    typename: string
}
```
