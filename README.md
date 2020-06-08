# 安装
npm i --save-dev git+https://github.com/fangkyi03/vue-loader-qiniu.git

# 功能说明
自动提取vue模板语言中的图片 并将其上传到七牛云 打包以后的web就是默认使用七牛云路径的了 省去了图片转码跟压缩 不仅代码体积会变小 而且打包速度还会变快

# 使用方法
在plugin-webpack4中配置qiniu参数
在lib/templateLoader中配置qiniu路径
暂时还没有将其放到参数里面 所以先直接这样改一下吧 有兴趣的可以自己改一下
