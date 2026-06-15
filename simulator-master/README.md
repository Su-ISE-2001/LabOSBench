# simulator
XRD/SEM/TEM/LM/FIB等模拟软件

- 本软件需要把html等静态模块打包，需要依赖 go-bindata（https://github.com/go-bindata/go-bindata）
- 可以利用go-bindata进行静态资源打包  
`go-bindata.exe --pkg htmlbind -o htmlbind/static.go static/...`
- 静态资源打包之后就可以对程序打包成可执行文件  
`go build`
- 打包完成后，就可以通过执行生成的二进制文件，双击生成的simulator.exe，程序会监听80端口
- 可以直接使用浏览器直接访问
`http://localhost`