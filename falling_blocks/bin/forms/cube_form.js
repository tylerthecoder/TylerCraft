class CubeForm {
    constructor(canvas, texture) {
        this.texture = texture;
        this.program = canvas.program;
        this.gl = canvas.gl;
    }
    initPositionBuffer(gl, size) {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            -size[0],
            -size[1],
            size[2],
            size[0],
            -size[1],
            size[2],
            size[0],
            size[1],
            size[2],
            -size[0],
            size[1],
            size[2],
            -size[0],
            -size[1],
            -size[2],
            -size[0],
            size[1],
            -size[2],
            size[0],
            size[1],
            -size[2],
            size[0],
            -size[1],
            -size[2],
            -size[0],
            size[1],
            -size[2],
            -size[0],
            size[1],
            size[2],
            size[0],
            size[1],
            size[2],
            size[0],
            size[1],
            -size[2],
            -size[0],
            -size[1],
            -size[2],
            size[0],
            -size[1],
            -size[2],
            size[0],
            -size[1],
            size[2],
            -size[0],
            -size[1],
            size[2],
            size[0],
            -size[1],
            -size[2],
            size[0],
            size[1],
            -size[2],
            size[0],
            size[1],
            size[2],
            size[0],
            -size[1],
            size[2],
            -size[0],
            -size[1],
            -size[2],
            -size[0],
            -size[1],
            size[2],
            -size[0],
            size[1],
            size[2],
            -size[0],
            size[1],
            -size[2]
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        return positionBuffer;
    }
    initIndexBuffer(gl) {
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        const indices = [
            0,
            1,
            2,
            0,
            2,
            3,
            4,
            5,
            6,
            4,
            6,
            7,
            8,
            9,
            10,
            8,
            10,
            11,
            12,
            13,
            14,
            12,
            14,
            15,
            16,
            17,
            18,
            16,
            18,
            19,
            20,
            21,
            22,
            20,
            22,
            23
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        return indexBuffer;
    }
    initTextureBuffer(gl) {
        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        const textureCoordinates = [
            0.0,
            0.0,
            1.0,
            0.0,
            1.0,
            1.0,
            0.0,
            1.0,
            0.0,
            0.0,
            1.0,
            0.0,
            1.0,
            1.0,
            0.0,
            1.0,
            0.0,
            0.0,
            1.0,
            0.0,
            1.0,
            1.0,
            0.0,
            1.0,
            0.0,
            0.0,
            1.0,
            0.0,
            1.0,
            1.0,
            0.0,
            1.0,
            0.0,
            0.0,
            1.0,
            0.0,
            1.0,
            1.0,
            0.0,
            1.0,
            0.0,
            0.0,
            1.0,
            0.0,
            1.0,
            1.0,
            0.0,
            1.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
        return textureCoordBuffer;
    }
    render(size, pos, rot, screenPos, screenRot) {
        const gl = this.gl;
        const programInfo = this.program;
        const buffers = {
            position: this.initPositionBuffer(gl, size),
            indices: this.initIndexBuffer(gl),
            textureCoord: this.initTextureBuffer(gl)
        };
        pos = pos.map((ele, index) => ele - screenPos[index]);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        const fieldOfView = (45 * Math.PI) / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
        const modelViewMatrix = mat4.create();
        mat4.rotate(modelViewMatrix, modelViewMatrix, Math.PI / 2 - screenRot[0], [
            1,
            0,
            0
        ]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, screenRot[1], [0, 1, 0]);
        mat4.translate(modelViewMatrix, modelViewMatrix, pos);
        mat4.rotate(modelViewMatrix, modelViewMatrix, rot, [0, 0, 1]);
        mat4.translate(modelViewMatrix, modelViewMatrix, pos);
        mat4.rotate(modelViewMatrix, modelViewMatrix, rot * 0.7, [0, 1, 0]);
        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        }
        {
            const num = 2;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
            gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, num, type, normalize, stride, offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
        }
        gl.useProgram(programInfo.program);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        {
            const vertexCount = 36;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }
    }
}
//# sourceMappingURL=cube_form.js.map