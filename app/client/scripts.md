Game scripts will be classes that attach to the main game and use
public methods on it to build a world.

methods script needs to implement

- GetActions, So actions can be sent by server
- ReceiveActions, Update state base on actions
- Update(actions) Called by main game
- Render() Called by client game
