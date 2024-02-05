const express = require('express')
const app = express();
const bodyParser = require('body-parser');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}))


app.set('view engine' , 'ejs')
app.set('views' , './views')


app.use(express.static('public'));

const userRoute = require('./routes/userRoute');
app.use('/' , userRoute);


var server = app.listen(3000 , ()=>{
    console.log(`server started`)
})

// socket io working and singnaling server

const socketIo=require('socket.io');
const io = socketIo(server)


io.on('connection' , (socket)=>{
    console.log('user connected:=> '+socket.id)

    // room socket login
    socket.on('join' , (roomName)=>{
        var rooms = io.sockets.adapter.rooms;
        var room = rooms.get(roomName)
    
        if(room == undefined){
            socket.join(roomName);
            socket.emit('created' )
        }
        else if(room.size === 1 ){
            socket.join(roomName);
            socket.emit('joined' )
            
        }else{
            socket.emit('full' , {message :"Room Full . plz create another room" })
        }
    })

    // signaling server
    socket.on("ready" , (roomName)=>{
        console.log("Ready :=> " );
        socket.broadcast.to(roomName).emit("ready");
    })

    socket.on('candidate' , (candidate , roomName)=>{
        console.log("candidate:=> ");
        socket.broadcast.to(roomName).emit('candidate' , candidate);
    })

    socket.on('offer' , (offer , roomName )=>{
        console.log("Offer:=> ")
       socket.broadcast.to(roomName).emit("offer" , offer)
    })

    socket.on('answer' , (answer , roomName)=>{
        console.log("Answer:=> " , );
        socket.broadcast.to(roomName).emit("answer" , answer);
    })
    
    // leave room
    socket.on('leave' , (roomName)=>{
        // to leave room
        socket.leave(roomName);
        
        
        // event for acknowledgement to another (peer) connnectd user
        socket.broadcast.to(roomName).emit('leaved');
    })
})