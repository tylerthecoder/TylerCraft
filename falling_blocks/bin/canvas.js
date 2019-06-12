class CanvasProgram {
    constructor() {
        this.gl = this.getCanvas();
        this.cubeTexture = this.loadTexture(this.gl, "./imgs/dirt.png");
        this.playerTexture = this.loadTexture(this.gl, "./imgs/player.png");
        this.clearCanvas();
    }
    clearCanvas() {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }
    getCanvas() {
        const canvas = document.querySelector("#glCanvas");
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;
        const gl = canvas.getContext("webgl");
        if (gl === null) {
            throw new Error("Unable to initialize WebGL. Your browser or machine may not support it.");
        }
        return gl;
    }
    async loadProgram() {
        const vsSource = await fetch("./vertex_shader.glsl").then(x => x.text());
        const fsSource = await fetch("./fragment_shader.glsl").then(x => x.text());
        const shaderProgram = this.initShaderProgram(this.gl, vsSource, fsSource);
        this.program = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(shaderProgram, "aVertexPosition"),
                textureCoord: this.gl.getAttribLocation(shaderProgram, "aTextureCoord")
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
                modelViewMatrix: this.gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
                uSampler: this.gl.getUniformLocation(shaderProgram, "uSampler")
            }
        };
    }
    initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.log("Unable to initialize the shader program: " +
                gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }
    loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    loadTexture(gl, url) {
        const isPowerOf2 = (x) => (x & (x - 1)) === 0;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
        const image = new Image();
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            }
            else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        };
        image.src = url;
        return texture;
    }
}
//# sourceMappingURL=canvas.js.map