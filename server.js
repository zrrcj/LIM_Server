var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);
var redis = require("redis"),
    client = redis.createClient();
/*监听端口*/    
server.listen(3000);
/*初始化用户对象用了分发消息，*/
var user = {};
console.log('服务器启动，监听端口：3000');
io.on('connection', function(socket) {
    /*开始捕捉事件*/
	//console.log('用户上线了：客户端id=' + socket.id);
    socket.on('message', function(d) {
		console.log(d)
        switch (d.type) { 

        /*用户上线*/  
        case 'reg':
            user[d.content.uid] = socket.id;
            var num=0,uuser=[];
            for (x in user){
               uuser.push(x);
                num++;
            }
            d.content.num=num;

            //全局事件 
            socket.broadcast.emit('addList', d.content);

            client.LRANGE(d.content.uid,'0', '-1', function (err, object) {
                  console.log(object)
                      io.sockets.sockets[socket.id].emit('setChatCache', object);
                      client.del(d.content.uid)
                })
            ///发给自己
            var reguser={uuser:uuser,num:num};
            socket.emit('reguser', reguser);

            console.log('用户上线了：用户id=' + d.content.uid + '| 客户端id=' + socket.id);
            break;

         /*用户发送消息*/   
        case 'chatMessage':
            var data = {
                username: ""+d.content.mine.username+"",
                avatar: ""+d.content.mine.avatar+"",
                id: ""+d.content.mine.id+"",
                content: ""+d.content.mine.content+"",
                type: ""+d.content.to.type+"",
                toid: ""+d.content.to.id+""
            };

            /*处理单聊事件*/
            if (data.type == 'friend') {
				console.log(user)
				console.log(data.toid)
				console.log(user[data.toid])
                if (user[d.content.to.id]) {/*广播消息*/
				io.sockets.sockets[user[data.toid]].emit('chatMessage', data);
                    console.log('【' + d.content.mine.username + '】对【' + d.content.to.username + '】说:' + d.content.mine.content)
                } else {
                    socket.emit('noonline', data);
					//如果用户不在线将消息缓存到数据库
					//console.log('【' + d.content.mine.username + '】对【' + d.content.to.username + '】说:' + d.content.mine.content)
                
                          console.log(data.toid)
                        client.lpush(data.toid, JSON.stringify(data), function (err, object) {
                            console.log(object)
                        })
}

               
               /*处理群聊事件*/ 
            } else if (d.content.to.type == 'group') {
                data.id = data.toid;
                socket.broadcast.emit('chatMessage', data)
            }
            break
        }

        /*注销事件*/
    }).on('disconnect', function() {
        var outid=0,usernum=0;
        for (x in user) {
            usernum++;
            if (user[x] == socket.id) {
                outid=x
               delete user[x]
            }
        }
         console.log('用户ID=' + outid + '下线了');
         var out={id:outid,num:usernum-1}
         io.sockets.emit('out',out);
    })
});