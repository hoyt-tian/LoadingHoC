import React, { ComponentClass, ComponentState } from "react";

type RenderResult = JSX.Element | false | null;

interface ILoadingConfig {
  fetchDataFunc: string;
  fetchDataCallback: string;
  renderFail: () => RenderResult;
  renderLoading: () => RenderResult;
  timeout: number;
}

type Promises = Promise<any> | Array<Promise<any>>;

type PromiseFunc = (promises?: Promises) => Promises;

type OptionalIndexed<T> = { [ key: string ]: T | undefined };

const renderLoading = () => <div className="am-loading-text">数据加载中...</div>;

const renderFail = () => <div className="am-page-refresh" onClick={() => window.location.reload()}>刷新</div>;

const Defaults: ILoadingConfig = {
  fetchDataCallback: "componentDidFetch",
  fetchDataFunc: "componentFetchData",
  renderFail,
  renderLoading,
  timeout: 15000,
};

type ILoadingHOCFactory = (WrapperComponent: ComponentClass, conf: ILoadingConfig) => ComponentClass;
interface ILoadingState extends Readonly<ComponentState> {
  __loading__: string
}

/*
 * Loading的通用组件
 */
const LoadingHOC: ILoadingHOCFactory = (WrapperComponent, conf = Defaults) => {
  class LoadingHOCComponent extends WrapperComponent {
    constructor(props?: any, context?: any) {
      super(props, context);
      this.state = {
        loading: "loading",
      };
      this.reload();
    }

    public render(): RenderResult {
      const {
        renderFail: fail = Defaults.renderFail,
        renderLoading: loading = Defaults.renderLoading,
      } = conf;
      const { state } = this;
      const { __loading__ } = state as ILoadingState;
      switch (__loading__) {
        case "fail":
          return fail();
        case "done":
          return super.render();
        case "loading":
        default:
          return loading();
      }
    }

    public reload() {
      try {
        const athis = this as unknown as OptionalIndexed<PromiseFunc>;
        const fetchDataFunc = athis[conf.fetchDataFunc];
        if (!fetchDataFunc) {
          throw new Error(`${WrapperComponent.name} does not has fetch data function ${conf.fetchDataFunc}`);
        }
        const ps = fetchDataFunc();
        const didFetch = (this as unknown as OptionalIndexed<(ps: Promises) => Promise<any>>)[conf.fetchDataCallback];
        return this.fetchData(ps).then((result: Promises) => {
          if (didFetch) {
            return didFetch.call(this, result).then(() => super.setState({
              __loading__: "done",
            }, () => {
              if (didFetch) {
                return didFetch(result);
              }
              return Promise.resolve();
            }));
          }
          const props = super.props as OptionalIndexed<PromiseFunc>;
          const callback = props[conf.fetchDataCallback];
          if (callback) {
            return callback(result);
          }
          return Promise.resolve();
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    private fetchData(promises: Promises = []){
      let promise = null;
      if (promises instanceof Array) {
        promise = Promise.all(promises);
      } else {
        promise = promises;
      }
      return Promise.race([ promise, new Promise((_resolve, reject) => {
        const { timeout = 5000 } = conf;
        setTimeout(() => reject(new Error("请求超时")), timeout);
      }) ]).then((ps: Promises) => ps, (fail: () => any) => new Promise((_r, j) => super.setState({
          __loading__: "fail",
        }, () => j(fail))));
    }
  }
  return LoadingHOCComponent;
};

export default LoadingHOC;
