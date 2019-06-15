var IFace;
(function (IFace) {
    IFace[IFace["FRONT"] = 0] = "FRONT";
    IFace[IFace["BACK"] = 1] = "BACK";
    IFace[IFace["TOP"] = 2] = "TOP";
    IFace[IFace["BOTTOM"] = 3] = "BOTTOM";
    IFace[IFace["RIGHT"] = 4] = "RIGHT";
    IFace[IFace["LEFT"] = 5] = "LEFT";
})(IFace || (IFace = {}));
class CubeForm {
    constructor(canvas, textures, size) {
        this.canvas = canvas;
        this.textures = textures;
        this.size = size;
        this.program = canvas.program;
        this.gl = canvas.gl;
        this.initPositionBuffer();
        this.initTextureBuffer();
    }
    getFace(i, dir, size) {
        const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        const pos = square
            .map(edge => {
            edge.splice(i, 0, dir);
            return edge.map((dim, i) => dim * size[i]);
        })
            .flat();
        return pos;
    }
    initPositionBuffer() {
        const facesToRender = [0, 1, 2, 3, 4, 5];
        const size = this.size;
        const base = [0, 1, 2, 0, 2, 3];
        this.faces = [];
        const positions = [];
        const indices = [];
        let count = 0;
        for (const face of facesToRender) {
            const i = face >> 1;
            const dir = face % 2 === 0 ? 1 : -1;
            const pos = this.getFace(i, dir, size);
            const index = base.map(x => x + count);
            count += 4;
            positions.push(...pos);
            indices.push(...index);
            this.faces.push({
                pos,
                index,
                texture: this.textures[face]
            });
        }
        const gl = this.gl;
        this.posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    }
    initTextureBuffer() {
        const gl = this.gl;
        this.textureBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        const textureCoordinates = [
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
            0.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
    }
    bindCube() {
        const programInfo = this.program;
        const gl = this.gl;
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }
    render(pos, screenPos, screenRot) {
        const gl = this.gl;
        const programInfo = this.program;
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
        mat4.translate(modelViewMatrix, modelViewMatrix, pos.map((ele, index) => (ele - screenPos[index]) * 2));
        this.bindCube();
        {
            const num = 2;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
            gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, num, type, normalize, stride, offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        {
            const type = gl.UNSIGNED_SHORT;
            let count = 0;
            for (const face of this.faces) {
                gl.bindTexture(gl.TEXTURE_2D, face.texture);
                gl.drawElements(gl.TRIANGLES, 6, type, count);
                count += 12;
            }
        }
    }
}
//# sourceMappingURL=cube_form.js.map