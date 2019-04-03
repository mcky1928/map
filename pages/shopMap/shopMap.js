var QQMapWX = require('../../utils/qqmap-wx-jssdk1.2/qqmap-wx-jssdk.min.js');
var qqmapsdk;
Page({
  data: {
    addListShow: false,
    chooseCity: false,
    regionShow: {
      province: false,
      city: false,
      district: true
    },
    regionData: {}, 
    currentRegion: {
      province: '选择城市',
      city: '选择城市',
      district: '选择城市',
    },
    currentProvince: '选择城市',
    currentCity: '选择城市',
    currentDistrict: '选择城市',
    latitude: '',
    longitude: '',
    centerData: {},
    nearList: [],
    suggestion: [],
    selectedId: 0,
    defaultKeyword: '房产小区',
    keyword: ''
  },
  onLoad: function () {
    let self =this;
    self.mapCtx = wx.createMapContext('myMap')
    // 实例化API核心类
    qqmapsdk = new QQMapWX({
      key: 'W57BZ-JDB6X-XPA4H-Z76MI-73FF2-24BT4'
    });
    wx.showLoading({
      title: '加载中'
    });
    //定位
    wx.getLocation({
      type: 'wgs84',
      success(res) {
        //console.log(res)
        const latitude = res.latitude
        const longitude = res.longitude
        const speed = res.speed
        const accuracy = res.accuracy
        //你地址解析
        qqmapsdk.reverseGeocoder({
          location: {
            latitude: latitude,
            longitude: longitude
          },
          success: function (res) {
            //console.log(res)
            self.setData({
              latitude: latitude,
              longitude: longitude,
              currentRegion: res.result.address_component,
              keyword: self.data.defaultKeyword
            })
            // 调用接口
            self.nearby_search();
          },
        });
      },
      fail(err) {
        //console.log(err)
        wx.hideLoading({});
        wx.showToast({
          title: '定位失败',
          icon: 'none',
          duration: 1500
        })
        setTimeout(function () {
          wx.navigateBack({
            delta: 1
          })
        }, 1500)
      }
    })
  },
  onReady: function () {
    
  },
  //监听拖动地图，拖动结束根据中心点更新页面
  mapChange: function (e) {
    let self = this;
    if (e.type == 'end' && (e.causedBy == 'scale' || e.causedBy == 'drag')){
      self.mapCtx.getCenterLocation({
        success: function (res) {
          //console.log(res)
          self.setData({
            nearList:[],
            latitude: res.latitude,
            longitude: res.longitude,
          })
          self.nearby_search();
        }
      })
    }
    
  },
  //重新定位
  reload: function () {
    this.onLoad();
  },
  //整理目前选择省市区的省市区列表
  getRegionData: function () {
    let self = this;
    //调用获取城市列表接口
    qqmapsdk.getCityList({
      success: function (res) {//成功后的回调
        //console.log(res)
        let provinceArr = res.result[0];
        let cityArr = [];
        let districtArr = [];
        for (var i = 0; i < provinceArr.length; i++) {
          var name = provinceArr[i].fullname;
          if (self.data.currentRegion.province == name) {
            if (name == '北京市' || name == '天津市' || name == '上海市' || name == '重庆市') {
              cityArr.push(provinceArr[i])
            } else {
              qqmapsdk.getDistrictByCityId({
                // 传入对应省份ID获得城市数据，传入城市ID获得区县数据,依次类推
                id: provinceArr[i].id,
                success: function (res) {//成功后的回调
                  //console.log(res);
                  cityArr = res.result[0];
                  self.setData({
                    regionData: {
                      province: provinceArr,
                      city: cityArr,
                      district: districtArr
                    }
                  })
                },
                fail: function (error) {
                  //console.error(error);
                },
                complete: function (res) {
                  //console.log(res);
                }
              });
            }
          }
        }
        for (var i = 0; i < res.result[1].length; i++) {
          var name = res.result[1][i].fullname;
          if (self.data.currentRegion.city == name) {
            qqmapsdk.getDistrictByCityId({
              // 传入对应省份ID获得城市数据，传入城市ID获得区县数据,依次类推
              id: res.result[1][i].id,
              success: function (res) {//成功后的回调
                //console.log(res);
                districtArr = res.result[0];
                self.setData({
                  regionData: {
                    province: provinceArr,
                    city: cityArr,
                    district: districtArr
                  }
                })
              },
              fail: function (error) {
                //console.error(error);
              },
              complete: function (res) {
                //console.log(res);
              }
            });
          }
        }
      },
      fail: function (error) {
        //console.error(error);
      },
      complete: function (res) {
        //console.log(res);
      }
    });
  },
  onShow: function () {
    let self = this;
  },
  //地图标记点
  addMarker: function (data) {
    //console.log(data)
    //console.log(data.title)
    var mks = [];
    mks.push({ // 获取返回结果，放到mks数组中
      title: data.title,
      id: data.id, 
      addr: data.addr,
      province: data.province,
      city: data.city,
      district: data.district,
      latitude: data.latitude,
      longitude: data.longitude,
      iconPath: "/images/my_marker.png", //图标路径
      width: 25,
      height: 25
    })
    this.setData({ //设置markers属性，将搜索结果显示在地图中
      markers: mks,
      currentRegion: {
        province: data.province,
        city: data.city,
        district: data.district,
      }
    })
    wx.hideLoading({});
  },
  //点击选择搜索结果
  backfill: function (e) {
    var id = e.currentTarget.id;
    let name = e.currentTarget.dataset.name;
    for (var i = 0; i < this.data.suggestion.length; i++) {
      if (i == id) {
        //console.log(this.data.suggestion[i])
        this.setData({
          centerData: this.data.suggestion[i],
          addListShow: false,
          latitude: this.data.suggestion[i].latitude,
          longitude: this.data.suggestion[i].longitude
        }); 
        this.nearby_search();
        return;
        //console.log(this.data.centerData)
      }
    }
  },
  //点击选择地图下方列表某项
  chooseCenter: function (e) {
    var id = e.currentTarget.id;
    let name = e.currentTarget.dataset.name;
    for (var i = 0; i < this.data.nearList.length; i++) {
      if (i == id) {
        this.setData({
          selectedId: id,
          centerData: this.data.nearList[i],
          latitude: this.data.nearList[i].latitude,
          longitude: this.data.nearList[i].longitude,
        });
        this.addMarker(this.data.nearList[id]);
        return;
        //console.log(this.data.centerData)
      }
    }
  },
  //显示搜索列表
  showAddList: function () {
    this.setData({
      addListShow: true
    })
  },
  // 根据关键词搜索附近位置
  nearby_search: function () {
    var self = this;
    wx.hideLoading();
    wx.showLoading({
      title: '加载中'
    });
    // 调用接口
    qqmapsdk.search({
      keyword: self.data.keyword,  //搜索关键词
      //boundary: 'nearby(' + self.data.latitude + ', ' + self.data.longitude + ', 1000, 16)',
      location: self.data.latitude + ',' + self.data.longitude,
      page_size: 20,
      page_index: 1,
      success: function (res) { //搜索成功后的回调
        //console.log(res.data)
        var sug = [];
        for (var i = 0; i < res.data.length; i++) {
          sug.push({ // 获取返回结果，放到sug数组中
            title: res.data[i].title,
            id: res.data[i].id,
            addr: res.data[i].address,
            province: res.data[i].ad_info.province,
            city: res.data[i].ad_info.city,
            district: res.data[i].ad_info.district,
            latitude: res.data[i].location.lat,
            longitude: res.data[i].location.lng
          });
        }
        self.setData({
          selectedId: 0,
          centerData: sug[0],
          nearList: sug, 
          suggestion: sug
        })
        self.addMarker(sug[0]);
      },
      fail: function (res) {
        //console.log(res);
      },
      complete: function (res) {
        //console.log(res);
      }
    });
  },
  //根据关键词搜索匹配位置
  getsuggest: function (e) {
    var _this = this;
    var keyword = e.detail.value;
    _this.setData({
      addListShow: true
    })
    //调用关键词提示接口
    qqmapsdk.getSuggestion({
      //获取输入框值并设置keyword参数
      keyword: keyword, //用户输入的关键词，可设置固定值,如keyword:'KFC'
      location: _this.data.latitude + ',' + _this.data.longitude,
      page_size: 20,
      page_index: 1,
      //region:'北京', //设置城市名，限制关键词所示的地域范围，非必填参数
      success: function (res) {//搜索成功后的回调
        //console.log(res);
        var sug = [];
        for (var i = 0; i < res.data.length; i++) {
          sug.push({ // 获取返回结果，放到sug数组中
            title: res.data[i].title,
            id: res.data[i].id,
            addr: res.data[i].address,
            province: res.data[i].province,
            city: res.data[i].city,
            district: res.data[i].district,
            latitude: res.data[i].location.lat,
            longitude: res.data[i].location.lng
          });
        }
        _this.setData({ //设置suggestion属性，将关键词搜索结果以列表形式展示
          suggestion: sug,
          nearList: sug,
          keyword: keyword
        });
      },
      fail: function (error) {
        //console.error(error);
      },
      complete: function (res) {
        //console.log(res);
      }
    });
  },
  //打开选择省市区页面
  chooseCity: function () {
    let self = this;
    self.getRegionData();
    self.setData({
      chooseCity: true,
      regionShow: {
        province: false,
        city: false,
        district: true
      },
      currentProvince: self.data.currentRegion.province,
      currentCity: self.data.currentRegion.city,
      currentDistrict: self.data.currentRegion.district,
    })
  },
  //选择省
  showProvince: function () {
    this.setData({
      regionShow: {
        province: true,
        city: false,
        district: false
      }
    })
  },
  //选择城市
  showCity: function () {
    this.setData({
      regionShow: {
        province: false,
        city: true,
        district: false
      }
    })
  },
  //选择地区
  showDistrict: function () {
    this.setData({
      regionShow: {
        province: false,
        city: false,
        district: true
      }
    })
  },
  //选择省之后操作
  selectProvince: function (e) {
    //console.log(e)
    let self = this;
    let id = e.currentTarget.dataset.id;
    let name = e.currentTarget.dataset.name;
    self.setData({
      currentProvince: name,
      currentCity: '请选择城市',
    })
    if (name == '北京市' || name == '天津市' || name == '上海市' || name == '重庆市'){
      var provinceArr = self.data.regionData.province;
      var cityArr = [];
      for (var i = 0; i < provinceArr.length;i++){
        if(provinceArr[i].fullname == name){
          cityArr.push(provinceArr[i])
          self.setData({
            regionData: {
              province: self.data.regionData.province,
              city: cityArr,
              district: self.data.regionData.district
            }
          })
          self.showCity();
          return;
        }
      }
    }else{
      let bj = self.data.regionShow;
      self.getById(id, name, bj)
    }
  },
  //选择城市之后操作
  selectCity: function (e) {
    let self = this;
    let id = e.currentTarget.dataset.id;
    let name = e.currentTarget.dataset.name;
    self.setData({
      currentCity: name,
      currentDistrict: '请选择城市',
    })
    let bj = self.data.regionShow;
    self.getById(id, name, bj)
  },
  //选择区县之后操作
  selectDistrict: function (e) {
    let self = this;
    let id = e.currentTarget.dataset.id;
    let name = e.currentTarget.dataset.name;
    let latitude = e.currentTarget.dataset.latitude;
    let longitude = e.currentTarget.dataset.longitude;
    self.setData({
      currentDistrict: name,
      latitude: latitude,
      longitude: longitude,
      currentRegion: {
        province: self.data.currentProvince,
        city: self.data.currentCity,
        district: name
      }, 
      chooseCity: false,
      keyword: self.data.defaultKeyword
    })
    self.nearby_search();
  },
  //根据选择省市加载市区列表
  getById: function (id,name,bj) {
    let self = this;
    qqmapsdk.getDistrictByCityId({
      // 传入对应省份ID获得城市数据，传入城市ID获得区县数据,依次类推
      id: id, //对应接口getCityList返回数据的Id，如：北京是'110000'
      success: function (res) {//成功后的回调
        //console.log(res);
        if(bj.province){
          self.setData({
            regionData: {
              province: self.data.regionData.province,
              city: res.result[0],
              district: self.data.regionData.district
            }
          })
          self.showCity();
        } else if (bj.city) {
          self.setData({
            regionData: {
              province: self.data.regionData.province,
              city: self.data.regionData.city,
              district: res.result[0]
            }
          })
          self.showDistrict();
        } else {
          self.setData({
            chooseCity: false,
          })
        }
      },
      fail: function (error) {
        //console.error(error);
      },
      complete: function (res) {
        //console.log(res);
      }
    });
  },
  //返回上一页或关闭搜索页面
  back1: function () {
    if (this.data.addListShow) {
      this.setData({
        addListShow: false
      })
    }else {
      wx.navigateBack({
        delta: 1
      })
    }
  },
  //关闭选择省市区页面
  back2: function () {
    this.setData({
      chooseCity: false
    })
  },
  //确认选择地址
  selectedOk: function () {
    //let pages = getCurrentPages(); //获取当前页面js里面的pages里的所有信息。
    //let prevPage = pages[pages.length - 2]; 
    console.log(this.data.centerData)
    //prevPage.setData({
      //storeAddress: this.data.centerData.title
    //})
    //wx.navigateBack({
      //delta: 1
    //})
  }
})