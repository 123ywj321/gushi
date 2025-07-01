// 地图功能模块
class G318Map {
    constructor() {
        this.map = null;
        this.routeLayer = null;
        this.markersGroup = null;
        this.currentLayer = 'satellite'; // 默认卫星图层
        this.routeVisible = true;
        this.visitedPOIs = new Set();
    }

    // 初始化地图
    initialize() {
        // 创建地图实例，中心点设置为318国道中段
        this.map = L.map('map', {
            center: [30.0571, 101.9638], // 新都桥
            zoom: 6,
            zoomControl: false,
            attributionControl: false
        });

        // 添加缩放控件到右下角
        L.control.zoom({
            position: 'bottomright'
        }).addTo(this.map);

        // 初始化图层
        this.initializeLayers();
        
        // 初始化标记组
        this.markersGroup = L.featureGroup().addTo(this.map);
        
        // 绘制路线
        this.drawRoute();
        
        // 添加景点标记
        this.addPOIMarkers();
        
        // 绑定事件
        this.bindEvents();
    }

    // 绑定地图事件
    bindEvents() {
        // 地图点击事件
        this.map.on('click', (e) => {
            // 可以在这里添加地图点击的处理逻辑
        });

        // 地图缩放事件
        this.map.on('zoomend', () => {
            // 可以在这里添加缩放结束的处理逻辑
        });

        // 地图移动事件
        this.map.on('moveend', () => {
            // 可以在这里添加移动结束的处理逻辑
        });
    }

    // 初始化地图图层
    initializeLayers() {
        // OpenStreetMap 标准图层
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        });

        // Esri 卫星图层
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19
        });

        // Esri 地形图层
        const terrainLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19
        });

        // CartoDB 暗色主题图层
        const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CartoDB',
            subdomains: 'abcd',
            maxZoom: 19
        });

        // 默认添加卫星图层
        satelliteLayer.addTo(this.map);
        this.currentLayer = 'satellite';

        // 保存图层引用
        this.layers = {
            osm: osmLayer,
            satellite: satelliteLayer,
            terrain: terrainLayer,
            dark: darkLayer
        };
    }

    // 绘制318国道路线
    drawRoute() {
        const routePoints = getRouteData();
        const segments = getRouteSegments();
        
        // 创建路线图层组
        this.routeLayer = L.featureGroup();
        
        // 分段绘制路线，使用不同颜色
        let startIndex = 0;
        segments.forEach((segment, index) => {
            let endIndex;
            if (index === 0) endIndex = 5; // 上海-武汉（上海→合肥→巢湖→安庆→九江→武汉）
            else if (index === 1) endIndex = 15; // 武汉-成都（武汉→荆州→宜昌→恩施→重庆→璧山→大足→资阳→成都）
            else endIndex = routePoints.length - 1; // 成都-拉萨（成都→雅安→康定→新都桥→理塘→巴塘→芒康→左贡→邦达→八宿→然乌→波密→林芝→工布江达→墨竹工卡→拉萨）
            
            const segmentPoints = routePoints.slice(startIndex, endIndex + 1);
            
            const polyline = L.polyline(segmentPoints, {
                color: segment.color,
                weight: 4,
                opacity: 0.8,
                smoothFactor: 1
            }).bindTooltip(segment.name, {
                permanent: false,
                direction: 'center'
            });
            
            this.routeLayer.addLayer(polyline);
            startIndex = endIndex;
        });
        
        this.routeLayer.addTo(this.map);
    }

    // 添加景点标记
    addPOIMarkers() {
        const pois = getAllPOIs();
        
        pois.forEach(poi => {
            const marker = this.createPOIMarker(poi);
            this.markersGroup.addLayer(marker);
        });
    }

    // 创建景点标记
    createPOIMarker(poi) {
        // 创建自定义图标
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-inner" data-type="${poi.type}"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const marker = L.marker(poi.coordinates, { 
            icon: icon,
            title: poi.name 
        });

        // 添加点击事件
        marker.on('click', () => {
            this.showPOIModal(poi);
            this.markAsVisited(poi.id);
        });

        // 添加悬停效果
        marker.on('mouseover', (e) => {
            const popup = L.popup({
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
                className: 'poi-preview-popup'
            })
            .setLatLng(e.latlng)
            .setContent(`
                <div class="poi-preview">
                    <h4>${poi.name}</h4>
                    <p class="poi-type">${poi.type}</p>
                    <p class="poi-distance">${poi.distance}</p>
                </div>
            `)
            .openOn(this.map);
            
            marker._popup = popup;
        });

        marker.on('mouseout', () => {
            if (marker._popup) {
                this.map.closePopup(marker._popup);
            }
        });

        return marker;
    }

    // 显示景点详情弹窗
    showPOIModal(poi) {
        window.uiManager.showPOIModal(poi);
    }

    // 标记景点为已访问
    markAsVisited(poiId) {
        this.visitedPOIs.add(poiId);
        this.updateProgress();
        
        // 更新标记样式
        this.markersGroup.eachLayer(layer => {
            if (layer.options.title === getPOIById(poiId).name) {
                layer.getElement().classList.add('visited');
            }
        });
    }

    // 更新进度
    updateProgress() {
        const progress = calculateProgress(Array.from(this.visitedPOIs));
        window.uiManager.updateProgress(progress);
    }

    // 飞行到指定景点
    flyToPOI(poiId) {
        const poi = getPOIById(poiId);
        if (poi) {
            this.map.flyTo(poi.coordinates, 12, {
                duration: 2,
                easeLinearity: 0.25
            });
            
            // 高亮对应标记
            this.highlightMarker(poi);
        }
    }

    // 高亮标记
    highlightMarker(poi) {
        this.markersGroup.eachLayer(layer => {
            const element = layer.getElement();
            if (element) {
                element.classList.remove('highlight');
            }
        });

        // 添加高亮效果到目标标记
        setTimeout(() => {
            this.markersGroup.eachLayer(layer => {
                if (layer.options.title === poi.name) {
                    const element = layer.getElement();
                    if (element) {
                        element.classList.add('highlight');
                    }
                }
            });
        }, 1000);
    }

    // 切换路线显示
    toggleRoute() {
        this.routeVisible = !this.routeVisible;
        
        if (this.routeVisible) {
            this.routeLayer.addTo(this.map);
        } else {
            this.map.removeLayer(this.routeLayer);
        }
        
        return this.routeVisible;
    }

    // 切换地图图层
    toggleLayer() {
        // 移除当前图层
        this.map.removeLayer(this.layers[this.currentLayer]);
        
        // 切换到下一个图层
        const layerKeys = Object.keys(this.layers);
        const currentIndex = layerKeys.indexOf(this.currentLayer);
        const nextIndex = (currentIndex + 1) % layerKeys.length;
        this.currentLayer = layerKeys[nextIndex];
        
        // 添加新图层
        this.layers[this.currentLayer].addTo(this.map);
        
        return this.currentLayer;
    }

    // 全屏切换
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            return true;
        } else {
            document.exitFullscreen();
            return false;
        }
    }

    // 获取地图边界内的景点
    getPOIsInBounds() {
        const bounds = this.map.getBounds();
        return getAllPOIs().filter(poi => {
            return bounds.contains(poi.coordinates);
        });
    }

    // 适应所有景点的视图
    fitAllPOIs() {
        const allCoords = getAllPOIs().map(poi => poi.coordinates);
        const group = new L.featureGroup(allCoords.map(coord => L.marker(coord)));
        this.map.fitBounds(group.getBounds().pad(0.1));
    }

    // 销毁地图
    destroy() {
        if (this.map) {
            this.map.remove();
        }
    }
}

// CSS样式注入（用于标记样式）
const markerStyles = `
    .custom-marker .marker-inner {
        width: 20px;
        height: 20px;
        background: #4CAF50;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .custom-marker:hover .marker-inner {
        transform: scale(1.3);
        box-shadow: 0 4px 20px rgba(76, 175, 80, 0.5);
    }
    
    .custom-marker.visited .marker-inner {
        background: #2196F3;
        border-color: #ffffff;
    }
    
    .custom-marker.highlight .marker-inner {
        animation: pulse 2s infinite;
        background: #FF5722;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.5); }
        100% { transform: scale(1); }
    }
    
    .poi-preview-popup .leaflet-popup-content {
        margin: 10px;
        min-width: 150px;
    }
    
    .poi-preview h4 {
        margin: 0 0 5px 0;
        color: #333;
        font-size: 14px;
    }
    
    .poi-preview .poi-type {
        background: #4CAF50;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        display: inline-block;
        margin: 0 0 5px 0;
    }
    
    .poi-preview .poi-distance {
        color: #666;
        font-size: 12px;
        margin: 0;
    }
`;

// 注入样式
if (!document.getElementById('marker-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'marker-styles';
    styleSheet.textContent = markerStyles;
    document.head.appendChild(styleSheet);
} 