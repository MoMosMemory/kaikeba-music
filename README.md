# 开课吧-音频可视化

## 一、用户与手机图片的交互

当鼠标在手机上滑动的时候，所有的手机会根据手机自身中心点距离鼠标的相对位置的远近进行上下跳跃

鼠标在手机图像容器内部移动的过程中，手机中心点的 `x轴` 坐标距离鼠标 `x轴` 坐标的值越小，手机越靠上

> 需要注意的一点，坐标差值有可能很大，几百几千像素都有可能，所以不可以直接使用 差值 作为移动位移，而应该是使用比例来进行运算，这个比例应该是相对于手机图像容器的整体宽度

```js
let oUlElement = document.querySelector('.oUl')
oUlElement.onmousemove = function({clientX}){
  // 计算每张手机图片的 translateY 值

}
```

初始化手机位置与每部手机的中心点坐标
```js
let imgElements = [...document.querySelectoAll('img')]; // 将伪数组转换为数组

// 最低音时， 图片的 translateY 的值
let baseVal = oUlElement.clientHeight * .8;

// 初始化每张手机图片的位置, 0-1之间的值, 0为最低位, 1为最高位
let initRatio = [1, .4, 0, .4, .6, .4, 0]

imgElements.forEach((img, index) => {
  let {x, y} = img.getBoundingClientRect()
  img._centerPoint = {
    x: x + img.width / 2
  }

  // setTransform 方法是 requestAnimationFrame 库提供, 用来初始化后续动画的属性初始值
  setTransform(img, 'translateY', getTranslateYByRatio(initRatio[index]))
})

// 根据当前的 ratio(比率) 与 baseVal 计算translateY
function getTranslateYByRatio(ratio){
  return baseVal * (1- ratio)
}
```

### 动画库 mTween.js

依据移动过程中的鼠标位置，动态计算每部手机的 translateY 的值

```js 
oUlElement.onmousemove = function({clientX}){
  let vals = imgElements.forEach((img, index) => {
    // 根据每张图片到当前 clientX 的距离推算比例
    return 1 - (Math.abs(clientX - img._centerPoint.x) / window.innerWidth) * 1.5
  })
  animatePhone(vals)
}

function animatePhone(ratio){
  imgElements.forEach((img, index) => {
    mTween.stop(img)
    mTween({
      el: img,
      fx: 'easeOut',
      duration: 200,
      attr:{
        translateY: getTranslateYByRatio(ratio[index])
      }
    })
  })
}
```

## 二、按钮交互

点击按钮随机改变颜色

```js
let btnElements = [...document.querySelectorAll('.btn')]
let colors = ['#ff5f5b','#ffb66e','#ffd96d','#e8f898','#8cf6f3','#92aef0','#b897e4']
// 保存当前颜色
let color = ''

btnElements.forEach((btn, index) => {
  btn.onclick = function(e){
    color = colors[Math.floor(Math.random() * colors.length)]
    btnElements.forEach(btn => {
      btn.style = ''
    })
    btn.style.backgroundColor = color
    btn.style.color = '#fff'
  }
})
    
```

## 三、播放音乐

```js
let musicList = [
  './resources/mo.mp3',
  './resources/Rihanna - Only Girl(In The World).mp3',
  './resources/Remix.mp3',
  './resources/Neptune Illusion Dennis Kuo.mp3'
]
let audio = null
let audioContext = null
let analyser = null
let sourceNode = null

btnElements.forEach((btn, index) => {
  btn.onclick = function(e){
    let ratio = [0,0,0,0,0,0,0]
    animatePhone(ratio)

    if(audio){
      audio.pause()
      audio = null
    }

    audio = new Audio()
    audio.addEventListener('canplay', play);  // 缓存成功之后才能播放
    audio.src = musicList[index]
  }
})

// canplay 事件处理逻辑
function play(){
  audio.play();

  // 创建一个用来处理音频的工作环境（上下文），我们可以通过它来进行音频的读取、解码等, 进行一些更底层的音频操作
  audioContext = new AudioContext()

  // 设置音频数据源
  sourceCode = audioContext.createMediaElementSource(audio)  

  // 获取音频时间和频率数据, 以及实现数据可视化, connect之前调用
  analyser = audioContext.createAnalyser()

  // connect连接器, 把声音数据链接到分析器，除了createAnalyser, 还有：BiquadFilterNode提亮音色、ChannelSplitterNode分割左右声道 等对音频数据进行处理，然后通过connect把处理后的数据链接到扬声器进行播放
  sourceNode.connect(analyser)

  // connect连接器, 把声音数据连接到扬声器
  sourceNode.connect(audioContext.destination)

  // 得到二进制音频数据，并解析
  parse()
}
      
```

## 四、解析数据

```js
function parse(){
  // analyser.frequencyBinCount: 二进制音频频率数据的数量（个数）一般是1024
  // Uint8Array：生成一个长度为 analyser.frequencyBinCount 的用于处理二进制数据的数组
  let freqArray = new Uint8Array(analyser.frequencyBinCount)
  // 将当前频率数据复制到freqArray
  analyser.getByteFrequencyData(freqArray)

  // 频谱反应的是声音各频率(frequencyBinCount)上能量的分布
  // 本例中只有7各频率, 所以需要进一步进行处理
  let arr = []
  let step = Math.round(freqArray.length / 7)
  for(let i = 0; i< 7; i++){
    arr.push(freqArray[i * step] / baseVal)
  }
  // 根据分析后的频谱数据生成动画
  animatePhone(arr)

  if(!audio.paused){
    requestAnimationFrame(parse)
  }
}
```

## 五、跳动的按钮

```js
let currentBtn = null;

// 增加，初始化按钮动画
btnElements.forEach(btn => {
	setTransform(btn, 'scale', 1)
})

btnElements.forEach(btn => {
	btn.onclick = function(){
		color = colors[Math.floor(Math.random() * colors.length)]
		
		// 增加 - 如果存在currentBtn，就停掉它的动画
		currentBtn && mTween.stop(currentBtn)
		
		btnElements.forEach(btn => {
			btn.style = ''
		})
		btn.style.backgroundColor = color
		btn.style.color = '#fff'
		
		currentBtn = this	// 缓存当前按钮
	}
})

function parse(){
	//..
	// 根据分析后的频谱数据生成动画
	animatePhone(arr)
	
	// 增加按钮跳动: 从 arr 样本中计算平均值（0.5 - 1.5之间）
	let averageVal = arr.reduce((p, c) => p + c, 0) / arr.length + .5
	animateBtn(averageVal)
	
	if(!audio.paused){
		requestAnimationFrame(parse)
	}
}

function animateBtn(scale){
	mTween.stop(currentBtn)
	mTween({
		el: currentBtn,
		fx: 'easeOut',
		duration: 200,
		attr: {
			scale
		}
	})
}

```

## 进度条
```js
let progress2Element = document.querySelector('.progress2')

function parse(){
	//...
	animatePhone(arr)
	
	// 增加进度条动画
	animateProgress()
	
	if(!audio.paused){
		requestAnimationFrame(parse)
	}
}

function animateProgress(){
	if(audio){
		progress2Element.style.backgroundColor = color
		progress2Element.style.width = audio.currentTime / audio.duration * 100 + '%'	// 当前播放时长/总时长
	}
}
```

## 暂停
```js
let stopBtn = document.querySelector('#stop_btn')
stopBtn.onclick = function(){
	audio.pause()
}

```


