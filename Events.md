
The game has many scripts. The scripts control entities in the game. 

Scripts have a list of actions that can be taken on them. These actions can be serilaized and sent over a server.
Example 
(entityId, action, data) = ("player1", "move", "left")

You can query a player for all of its actions

Script data is not serilaized

Example Scripts
JumpScript,
MoveScript,
GravityScript,



Flow of events for user pressing space:
- JS creates a jump event 
- Jump event sent over the wire (either to server or worker)
- Game recieves jump events and finds script for it
- Script looks up the event and executes it



Player Places block:
- Js creates a place block event
- Sent over wire
- Game recieves place block event and finds script for it
- Script looks up the event and executes it
- Chunks have been updateds so JS game scripts are called


