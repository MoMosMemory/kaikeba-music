class MusicView {
	constructor() {
		this.progressBar = this.getElement('.playing-progress-bar')		// 进度条
		this.pauseBtn = this.getElement('.pause-btn .ball')						// 暂停按钮
		this.ctrlBtns = this.getElements('.play-btn .ball')						// 各种音乐播放按钮
		this.playBlockPanel = this.getElement('.play-blocks')					// 频谱容器
		this.playBlocks = this.getElements('.play-blocks .block')			// 频谱块（手机）

		this.baseWidth = this.playBlockPanel.clientWidth // 宽度
		this.baseHeight = this.playBlockPanel.clientHeight * 0.8 // 整体高度(比例为0时不希望完全不显示, 所以整体只取高度的80%)
		this.initialRatio = [1, 0.6, 0.8, 0.4, 0, 0.6, 0.2] // 初始位移比例
		this.lastRatio = []

		this.color = null // 当前点击生成的随机颜色(下面颜色列表中的一种)
		this.colorList = ['#ff5f5b', '#ffb66e', '#ffd96d', '#e8f898', '#8cf6f3', '#92aef0', '#b897e4'] // 颜色列表

		this.musicList = [
			'./resources/cocoBall.mp3',
			'./resources/故乡的风景.mp3',
			'./resources/永远同在.mp3',
		]
		this.audio = null
		this.audioContext = null
		this.analyser = null
		this.sourceNode = null
		this.currentBtn = null
	}

	getElement(selector, context) {
		context = context || document
		return context.querySelector(selector)
	}
	getElements(selector, context) {
		context = context || document
		return [...context.querySelectorAll(selector)]
	}

	init() {
		this.animatePhone(this.initialRatio) // 初始位移
		this.bindEvents() // 绑定事件
	}

	// 绑定事件
	bindEvents() {
		const that = this
		
		// 鼠标mousemove事件
		this.mouseEvents()

		// 点击播放按钮
		this.ctrlBtns.forEach((btn, index) => {
			btn.addEventListener('click', (e) => {  
				const thisBtn = e.target 				
				if(this.audio && this.currentBtn === thisBtn){ 
					this.changePlayStaus()
				} else{
					this.currentBtn = thisBtn
					this.setRandomColor(thisBtn)				// 设置随机颜色  
					this.toPlay(this.musicList[index])	// 播放	
				}
			})
		})

		// 点击暂停播放按钮
		this.pauseBtn.addEventListener('click', () => {
			that.changePlayStaus()
		})
	}	

	// 鼠标mousemove事件
	mouseEvents() {
		// 计算每部手机的中心点位置
		this.setCenterPoint()

		// mousemove事件
		this.playBlockPanel.addEventListener('mousemove', ({ clientX }) => {
			if(!this.audio || this.audio.paused){
				let ratio = this.playBlocks.map(block => {
					return 1 - Math.abs(clientX - block._centerPoint.x) / this.baseWidth
				})
				this.animatePhone(ratio)				
			}
		})
		this.playBlockPanel.addEventListener('mouseleave', ({ clientX }) => {
			if(!this.audio || this.audio.paused){
				this.animatePhone([...this.initialRatio, ...this.lastRatio]) // 初始位移 	
			}
		})
	}

	// 计算每部手机的中心点
	setCenterPoint() {
		this.playBlocks.forEach(block => {
			let { x, width } = block.getBoundingClientRect()
			block._centerPoint = {
				x: x + width / 2
			}
		})
	}
	
	// 暂停播放 or 继续播放
	changePlayStaus() {
		if (this.audio) {
			const isPaused = this.audio.paused 
			if(isPaused){
				this.audio.play()		// 暂停状态就恢复播放
			} else{
				this.audio.pause()			// 播放状态就停止播放
			} 
			this.setPauseBtnText()
		}
	}
	setPauseBtnText(){
		const isPaused = this.audio && this.audio.paused 
		const text = isPaused ? '播放' : '暂停'
		this.pauseBtn.innerHTML = text
	}

	// 设置随机颜色
	setRandomColor(btnTarget) {
		const randomIndex = Math.floor(Math.random() * this.colorList.length)
		this.color = this.colorList[randomIndex]
		this.ctrlBtns.forEach(btn => {
			btn.style.backgroundColor = '#fff'
		})
		btnTarget.style.backgroundColor = this.color
		this.progressBar.style.backgroundColor = this.color
	}

	// 播放按钮
	toPlay(src) {
		if (this.audio) {
			this.audio.pause()
			this.lastRatio = []
			this.audio = null
		}
		this.audio = new Audio()
		this.audio.src = src
		this.audio.addEventListener('canplay', () => {
			this.play()
			this.setPauseBtnText()				
		})
	}
	play() {
		// audio.play() 可以播放, 但是这种播放方式获取不到音频的数据 
		this.audio.play()

		// 为了进行一些更底层的音频操作, 使用 AudioContext 创建一个用来处理音频的工作环境(上下文)
		// 可以通过它来进行音频的读取、解码等(建议创建一个AudioContext对象并复用它) 
		this.audioContext = this.audioContext || new AudioContext()

		// 创建一个 MediaElementAudioSourceNode 接口
		// 该接口代表 某个存在的 HTML <audio> or <video> 元素(HTMLMediaElement 对象) 所组成的音频源(只有输入没有输出)
		// 注意: 调用该方法的结果, HTMLMediaElement对象 的播放将会由 AudioContext 的音频处理图接管, 原来的 play() 方法无效
		this.sourceNode = this.audioContext.createMediaElementSource(this.audio)

		// 创建一个 AnalyserNode 分析器, 可以获取音频时间和频率数据, 以及实现数据可视化(connect之前调用)
		this.analyser = this.audioContext.createAnalyser()

		// connect连接器, 把声音数据链接到分析器进行分析
		this.sourceNode.connect(this.analyser)


		// connect连接器, 把声音数据连接到扬声器 
		// 只读destination属性: 返回一个 AudioDestinationNode. It can be thought of as the audio-rendering device.
		this.sourceNode.connect(this.audioContext.destination)

		// 得到二进制音频数据，并解析
		this.parse()
	}

	// 解析
	parse() { 
		// analyser.frequencyBinCount: 二进制音频频率数据的数量（个数）一般是1024
		// Uint8Array：生成一个长度为 analyser.frequencyBinCount 的用于处理二进制数据的数组
		let freqArray = new Uint8Array(this.analyser.frequencyBinCount)

		// 将当前频率数据复制到freqArray
		this.analyser.getByteFrequencyData(freqArray)

		// 频谱反应的是声音各频率(frequencyBinCount)上能量的分布
		// 本例中只有7各频率, 所以需要进一步进行处理
		let arr = []
		let step = Math.round(freqArray.length / 7)
		for (let i = 0; i < 7; i++) {
			arr.push(freqArray[i * step] / this.baseHeight)
		}
		// 根据分析后的频谱数据生成动画
		this.lastRatio = arr
		this.animatePhone(arr)
		
		// 进度条
		this.calcProgressBar()
		
		// 按钮跳动: reduce方法进行迭代操作, 初始值为 0
		let averageVal = arr.reduce((p, c) => p + c, 0) / arr.length + .75 
		this.animateScale(averageVal)

		// 使用 requestAnimationFrame 动画重复调用 parse 解析方法  
		if (!this.audio.paused) { 		
			requestAnimationFrame(() => {
				this.parse()
			})
		}
	}
	
	// 进度条
	calcProgressBar(){
		if(this.audio){
			const { currentTime, duration } = this.audio
			this.progressBar.style.width = currentTime / duration * 100 + '%'
		}
	}

	// 计算位移高度
	animatePhone(ratio) {
		this.playBlocks.forEach((block, index) => {
			this.setTranslateY(block, this.getTranslateYByRatio(ratio[index]))
		})
	}
	getTranslateYByRatio(ratio) {
		return this.baseHeight * (1 - ratio)
	}
	setTranslateY(element, transY) {
		element.style.transform = `translateY(${transY}px)`
	}
	
	// 计算按钮缩放
	animateScale(ratio) {
		this.currentBtn && this.setScale(this.currentBtn, ratio) 
	}
	setScale(element, scale) {
		element.style.transform = `scale(${scale})`
	}
}

let musicView = new MusicView()
musicView.init()
