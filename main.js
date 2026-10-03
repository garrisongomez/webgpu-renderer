
// async functions can pause mid-executation and wait for something to finish
// before continuing without freezing the browser while it waits
// await can only be used in an async function
async function main() {
    // requesting isn't immediate, and await pauses until promise is fulffiled
    if (!navigator.gpu) {
        console.error('WebGPU not supported in this browser');
        return;
    }
    // request adapter finds the hardware itself
    const adapter =  await navigator.gpu.requestAdapter();
    // request device creates a connection (gpu handle)
    const device = await adapter.requestDevice();
    // canvas id is stored in HTML and has an ID , you can grab elements by their ID in the HTML file using document.getElementbyID
    const canvas = document.getElementById('gpuCanvas');
    // canvases can be used in different ways, and you can use getContext to pass the specific one you want it to use using a string
    const context =  canvas.getContext('webgpu');
    // getPrefferCanvasFormat gets the pixel format that best works with the display based on the GPU
    const format = navigator.gpu.getPreferredCanvasFormat();
    // allows the context to give textures 
    context.configure({
        device,
        format
    })
    // the entire shader is made through a template as a literal string made 
    // in WGSL (webgpu shading language)
    // vertex shaders are functions that are marked with @vertex, returning a position
    // w in a vec4f (vector with 4 floats) is a part of clip space math
    const shaderCode = `
        // everything in WGSL needs a semicolon unlike JS. 
        // GPUS dont have the concept of "tuples" or "'color types" but 
        // instead only use vectors as a fundamental data structure
        // THE CODE determines how these vectors are interpretted 
        @vertex
        fn vertexMain(@builtin(vertex_index) vertIndex: u32) -> @builtin(position) vec4f {
            var positions = array<vec2f, 3>(
                vec2f(0.0, 0.5),
                vec2f(-0.5, -0.5),
                vec2f(0.5, -0.5)
            );
            let pos = positions[vertIndex];
            return vec4f(pos, 0.0, 1.0);

        }
        // @location determines the render target the the fragment shader writes to
        
        @fragment
        fn fragmentMain() -> @location(0) vec4f {

            return vec4f(1.0, 0.0, 0.0, 1.0);
        
        
        
        }
            `
    // shader code is just a JS string, but the GPU can't use a string directlyl
    // createShaderModule takes the string, and gives it to the GPU driver to compile
    // stores the acutal machine code to be executed
    const module = device.createShaderModule({ code: shaderCode })
    // render pipeline bundles everything that the GPU needs to draw someting
    // into one object. old gpus did not have pipelines, so each thing
    // needed to be set individually one at a time
    const pipeline = device.createRenderPipeline({
        // describes how external ldata like textures flow into the shader
        layout : 'auto',
        // tells pipeline which compiled shader to use for vertex, and which function inside the shader it should call since it could contiain multiple functions
        vertex: {

            module,
            entryPoint: 'vertexMain'
        },
        // targets array describes what the fragment shader is writing into
        fragment: {
            module,
            entryPoint: 'fragmentMain',
            targets: [{format}]
        },
        // tells the GPU how to connect vertices into shapes
        // triangle list means "every consectuive vertices make one triangle"

        primitive: {
            topology: 'triangle-list' 
        }


    })
    console.log(device);
    async function render(time) {
    // a command encoder creates a list of commands to be submitted all at once
    // rather than doing one command at a time -> more efficient
    const encoder = device.createCommandEncoder()
    // a RENDER PASS is a logical rendering step that defines
    // WHAT gets drawn, WHERE it goes, and WHAT conditions

    const pass = encoder.beginRenderPass({ 
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: {r:0, g:0, b:1, a:0.2},
            loadOp: 'clear',
            storeOp: 'store'



        }]
    });
    // set pipeline tells GPU which pipeline to use
    pass.setPipeline(pipeline)
    // draw(3) says run the vertex shader 3 times
    pass.draw(3)
    pass.end()
    // sends the pipeline to the GPU to execute
    device.queue.submit([encoder.finish()])
    console.log(time)
    // request animation frame is a callback that calls render with an automatic timestamp
    requestAnimationFrame(render)
}

}

requestAnimationFrame(render)