# LoadingHoC
通用的Loading高阶组件，支持定制加载中、加载失败的各种页面。

# 一般用法
## 直接使用

```javascript
import LoadHOC from 'loading-hoc'
class App extends React.PureComponent {
  /**
   * 发送并行数据请求
   * */
  componentFetchData() {
    return [
      fetch(),
      new Promise(rs => setTimeout(rs, 1000))
    ]
  }

  /**
   * 数据统一返回后处理
   * */
  componentDidFetch(ps) {
    const [r1, r2, ...rest] = ps;
  }
}

export default LoadHOC(App, { timeout: 3000 })
```

## 可配置参数
可以配置的参数包括：

timeout: 整数，加载超时时间，默认5000ms

renderLoading: 函数，加载中的页面渲染，一般需要在项目中定制,默认为
```javascript
() => <div>数据加载中...</div>
```

renderFail: 函数，加载失败的页面渲染，一般需要在项目中定制，默认为
```javascript
() => <div onClick={() => window.location.reload()}>刷新</div>
```

fetchDataFunc: 字符串，目标组件中，发送数据的方法，该方法必须返回一个promise或者一个promise数组，代表需要（并行）请求的数据，默认方法名为"componentFetchData",
fetchDataCallback: 字符串，获取到数据的回调函数。"componentDidFetch"。这个回调函数可以同时出现在组件方法中，或者成为组件的属性。当数据获取完成后，首先调用组件方法中的fetchDataCallback（如果有的话），然后再调用props中的fetchDataCallback（如果有的话）。

更为常见的用法如下，在项目中将根据需要，定制加载组件的各种处理，然后在各个页面中直接调用高阶组件即可。
```javascript
/**
*** 公共组件：components/LoadHOC
**/
import LoadHOC from 'loading-hoc';
import './index.less';

const renderLoading = () => (
  <div className="am-loading page">
    <i className="am-icon loading" aria-hidden="true"></i>
    <div className="am-loading-text">数据加载中...</div>
  </div>
);

const renderFail = () => (
  <div className="am-page-result">
    <div className="am-page-result-wrap no-button">
      <div className="am-page-result-pic am-icon page-busy"></div>
      <div className="am-page-result-title">系统繁忙，请稍后再试</div>
    </div>
    <div className="am-page-refresh" onClick={() => window.location.reload()}>刷新</div>
  </div>
);

const Defaults = {
  renderFail,
  renderLoading,
  timeout: 5000,
};

export default Component => LoadHOC(Component, Defaults);
```

在需要增加loading效果的组件上，，项目中的加载中效果和加载失败效果均为统一的样式。
```javascript
import LoadingHOC from '../../components/LoadHOC';
class App extends React.PureComponent {}
export default LoadingHOC(App);
```