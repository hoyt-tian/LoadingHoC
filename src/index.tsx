import React, { ComponentClass } from "react";

type RenderResult = JSX.Element | false | null;

type reloadFunc = () => Promise<any>;

type renderFailFunc = (reload: reloadFunc) => RenderResult;

interface ILoadingConfig {
  fetchDataFunc: string;
  fetchDataCallback: string;
  renderFail: renderFailFunc;
  renderLoading: () => RenderResult;
  timeout: number;
}

type Promises = Promise<any> | Array<Promise<any>>;

type PromiseFunc = (promises?: Promises) => Promises;

interface IOptionalIndexed<T> { [ key: string ]: T | undefined; }

const renderLoading = () => <div>数据加载中...</div>;

const renderFail: renderFailFunc = (reload) => <div onClick={() => reload()}>刷新</div>;

const Defaults: ILoadingConfig = {
  fetchDataCallback: "componentDidFetch",
  fetchDataFunc: "componentFetchData",
  renderFail,
  renderLoading,
  timeout: 5000,
};

export interface ILoadingHOCComponent {
  reload(): Promise<any>;
  componentDidFetch?(): Promises;
  componentFetchData?(): (promises: Promises) => Promise<any>;
}

const $StateKey = `@loading-hoc/$K-${Math.random().toString(36).substring(2)}`;

/*
 * Loading的通用组件
 */
export default function LoadingHOC<T>(WrapperComponent: ComponentClass<T>, config = {}) {
  const conf = {
    ...Defaults,
    ...config,
  };
  return class extends WrapperComponent implements ILoadingHOCComponent {

    constructor(props?: any, context?: any) {
      super(props, context);
      const { state = {} } = this;
      this.state = {
        ...state,
        [$StateKey]: "loading",
      };
      this.reload();
    }

    public render(): RenderResult {
      const {
        renderFail: fail,
        renderLoading: loading,
      } = conf;
      const { state } = this;
      const $State = state as any;
      switch ($State[$StateKey]) {
        case "fail":
          return fail(this.reload);
        case "done":
          return super.render();
        case "loading":
        default:
          return loading();
      }
    }

    public reload = (): Promise<any> => {
      try {
        const athis = this as unknown as IOptionalIndexed<PromiseFunc>;
        const fetchDataFunc = athis[conf.fetchDataFunc];
        if (!fetchDataFunc) {
          throw new Error(`${WrapperComponent.name} does not has fetch data function ${conf.fetchDataFunc}`);
        }
        const ps = fetchDataFunc.call(this);
        let didFetch = (this as unknown as IOptionalIndexed<(ps: Promises) => Promise<any>>)[conf.fetchDataCallback];
        didFetch = didFetch && didFetch.bind(this);
        return this.fetchData(ps).then((result: Promises) => {
          const props = this.props as IOptionalIndexed<PromiseFunc>;
          const callback = props[conf.fetchDataCallback];
          if (didFetch) {
            return didFetch(result)
              .then(() => new Promise((resovle) => this.setState({ [$StateKey]: "done" }, resovle)))
              .then(() => callback ? callback(result) : Promise.resolve());
          }
          return callback ? callback(result) : Promise.resolve();
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    private fetchData(promises: Promises = []) {
      const promise = promises instanceof Array ? Promise.all(promises) : promises;
      return Promise.race([promise, new Promise((_resolve, reject) => {
        const { timeout = 5000 } = conf;
        setTimeout(() => reject(new Error("请求超时")), timeout);
      })]).then((ps: Promises) => ps, (fail: () => any) => new Promise((_r, j) => this.setState({
        [$StateKey]: "fail",
      }, () => j(fail))));
    }
  };
}
