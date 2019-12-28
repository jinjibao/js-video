# js-vidoe
公司需要一个js原生的视频录像功能，之前没用做了，写个笔记记录下。

##### 一、获取摄像头

既然要录像，就要获取摄像头权限。那我们就先实现这一步再说。通过参阅一些资料得知，js可以使用[navigator.mediaDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)来获取摄像头。

``` HTML
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>demo</title>
</head>

<body>
    <video id="video"></video>
    <button id="button">开始</button>
</body>
<script>
    const video = document.getElementById("video")
    button.addEventListener("click", function() {
        openCam()
    })
    // 打开摄像头
    const openCam = function() {
        const constraints = {
            video: true,
            audio: false
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {
                /* 使用这个stream stream */
                video.src = stream
                video.play()
            })
            .catch(function(err) {
                console.log(err)
                /* 处理error */
            });
    }
</script>

</html>
```

在手机运行demo，会发现navigator.mediaDevices总是undefined，原因是navigator.mediaDevices() 只有在以下三种环境中才能获取到：

> 1、localhost 域
> 2、开启了 HTTPS 的域
> 3、使用 file:// 协议打开的本地文件

因为我是用的pc开发，也没有摄像头，手机没发用localhost访问，就用node搭建了一个https服务
a、生成证书文件

> 1、打开git bash检测openssl是否安装：openssl version -a
> 2、生成私钥key文件：openssl genrsa -out privatekey.pem 1024
> 3、通过私钥生成CSR证书签名：openssl req -new -key privatekey.pem -out certrequest.csr
> 4、通过私钥和证书签名生成证书文件：openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem

b、编写node代码

``` JavaScript
let https = require('https');
let fs = require('fs');
let express = require('express');

let app = express();
app.use(express.static('./public'));

let options = {
    key: fs.readFileSync('./privatekey.pem'),
    cert: fs.readFileSync('./certificate.pem')
}

let https_server = https.createServer(options, app);
https_server.listen(8089)
```

对于使用笔记本的同学来说，直接用手机访问localhost就可以了。下面在提供一种在Chrome中使用http访问的方法，在手机端测试下貌似不行，只有在pc上可以。

> 打开 chrome://flags/#unsafely-treat-insecure-origin-as-secure
> 将该 flag 切换成 enable 状态
> 输入框中填写需要开启的域名，譬如 http://example.com"，多个以逗号分隔。

但是这是我们并不能正常运行代码，点击开是会得到一条报错:8089/[object%20MediaStream] 404 (Not Found)。将then方法替换为下面的代码就行了

``` JavaScript
.then(function(stream) {
    // 将摄像头拍到的东西，通过video展现出来
    video.srcObject = stream;
    video.onloadedmetadata = function(e) {
        video.play();
    };
})
```

##### 二、打开后置摄像头

现在我们能正常调起摄像头了，但是默认打开的是后置摄像头，只需要修改constraints就可以了

``` JavaScript
//修改constraints
const constraints = {
    video: {
        facingMode: 'environment',
    },
    audio: false,
};
```

根据需求还需要一个转换摄像头的按钮。整体思路比较简单，当点击按钮是就关闭当前媒体，再重新打开一个相反的摄像头

``` JavaScript
const change = document.getElementById('change')
// environment：后置 user：前置
let facingMode = "environment"
// 保存媒体流
let currentStream = null
change.addEventListener("click", function() {
    facingMode = facingMode === "user" ? "environment" : "user"
    openCam()
})
// 停止所有的媒体
function stopMediaTracks(stream) {
    stream.getTracks().forEach(track => {
        track.stop();
    });
}
// 修改openCam
function openCam() {
    if (currentStream) stopMediaTracks(currentStream);
    const constraints = {
        video: {
            facingMode: facingMode,
        },
        audio: false,
    };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
                currentStream = stream
                    ......
            }
        }
```

##### 三、开始录像

基本的事情我们都做到了，接下来就要录制视屏, 代码实现

``` JavaScript
let allChunks = [];
// 捕捉canvas的内容，转化为MediaStream对象
const stream2 = canvas.captureStream(60);
// 创建一个录制MediaRecorder 对象
const recorder = new MediaRecorder(stream2, {
    mimeType: 'video/webm;codecs=vp9'
});
//开始录制
function startRecording() {
    // 每10ms记录一次，也就是执行ondataavailable
    recorder.start(10);
}
// 停止录制
function stopAndblobDownload() {
    recorder.stop();
    // 将录制的数据流转化为Blob
    const fullBlob = new Blob(allChunks);
    // 生成一个路径，可上传下载
    const downloadUrl = window.URL.createObjectURL(fullBlob);
}
// 将录制的数据流保存起来
recorder.ondataavailable = e => {
    allChunks.push(
        e.data
    );
}

function openCam() {
    ......
    then(res => {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {
                    ......
                    // 把video写入到canvas中
                    setInterval(() => {
                        context.drawImage(video, 0, 0, 640, 480);
                    }, Math.floor(1000 / 60));
                }
            }
    })
}
```

以上就基本实现了录制视频功能。

##### 四、思路总结

首先我们得用navigator.mediaDevices.getUserMedia获取摄像头权限，这里注意mediaDevices使用的条件。将getUserMedia的成功回调函数（then）中得到的媒体流，用video呈现，再用canvas（drawImage API）绘制vidoe。转换（captureStream API）canvas为MediaStream对象。通过MediaRecorder对象进行录制。其实captureStream是HTMLMediaElement原型上的方法，所有HTMLMediaElement都能调用，也就是说video能直接转换为MediaStream对象。修改代码：

``` JavaScript
  //  const stream2 = canvas.captureStream(60); 
  const stream2 = video.captureStream(60);
  ...
  // setInterval(() => {
  //   context.drawImage(stream, 0, 0, 640, 480);
  // }, Math.floor(1000 / 60));
  ...
```

这样我们就不需要canvas。

##### 结束语

第一次写这种东西，不喜勿喷。[完成demo]()

