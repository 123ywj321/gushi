// 主应用程序
class G318StoryMap {
    constructor() {
        this.mapInstance = null;
        this.uiManager = null;
        this.isInitialized = false;
    }

    // 初始化应用
    async initialize() {
        try {
            console.log('初始化318国道故事地图...');
            
            // 初始化UI管理器
            this.uiManager = new UIManager();
            window.uiManager = this.uiManager;
            
            // 初始化地图
            this.mapInstance = new G318Map();
            window.mapInstance = this.mapInstance;
            
            // 等待DOM完全加载
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // 初始化各个模块
            await this.initializeModules();
            
            // 设置全局错误处理
            this.setupErrorHandling();
            
            // 标记为已初始化
            this.isInitialized = true;
            
            console.log('318国道故事地图初始化完成！');
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.showErrorMessage('应用初始化失败，请刷新页面重试。');
        }
    }

    // 初始化各个模块
    async initializeModules() {
        // 初始化UI
        this.uiManager.initialize();
        
        // 稍微延迟初始化地图，确保DOM准备就绪
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 初始化地图
        this.mapInstance.initialize();
        
        // 设置移动端适配
        this.setupMobileAdaptation();
        
        // 预加载数据
        this.preloadData();
    }

    // 设置移动端适配
    setupMobileAdaptation() {
        // 检测是否为移动设备
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // 在移动设备上默认隐藏侧边栏
            document.getElementById('sidebar').classList.add('hidden');
            
            // 调整地图初始视图
            this.mapInstance.map.setView([30.0571, 101.9638], 5);
            
            // 添加触摸事件优化
            this.setupTouchEvents();
        }
    }

    // 设置触摸事件
    setupTouchEvents() {
        let touchStartY = 0;
        let touchStartX = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
        });
        
        document.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            
            const deltaY = touchStartY - touchEndY;
            const deltaX = touchStartX - touchEndX;
            
            // 向上滑动显示侧边栏
            if (deltaY > 50 && Math.abs(deltaX) < 100) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar.classList.contains('hidden')) {
                    sidebar.classList.remove('hidden');
                }
            }
            
            // 向下滑动隐藏侧边栏  
            if (deltaY < -50 && Math.abs(deltaX) < 100) {
                const sidebar = document.getElementById('sidebar');
                if (!sidebar.classList.contains('hidden')) {
                    sidebar.classList.add('hidden');
                }
            }
        });
    }

    // 预加载数据
    preloadData() {
        // 预加载景点图片
        const allPOIs = getAllPOIs();
        allPOIs.forEach(poi => {
            if (poi.images && poi.images.length > 0) {
                poi.images.forEach(imageUrl => {
                    const img = new Image();
                    img.src = imageUrl;
                });
            }
        });
        
        console.log(`预加载了${allPOIs.length}个景点的数据`);
    }

    // 设置全局错误处理
    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('全局错误:', e.error);
            if (!this.isInitialized) {
                this.showErrorMessage('页面加载出现错误，请刷新重试。');
            }
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            console.error('未处理的Promise错误:', e.reason);
        });
    }

    // 显示错误消息
    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 10000;
            text-align: center;
            font-size: 16px;
        `;
        errorDiv.innerHTML = `
            <p>${message}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: red;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                margin-top: 10px;
                cursor: pointer;
            ">刷新页面</button>
        `;
        
        document.body.appendChild(errorDiv);
    }

    // 获取应用状态
    getStatus() {
        return {
            initialized: this.isInitialized,
            mapReady: this.mapInstance && this.mapInstance.map !== null,
            uiReady: this.uiManager !== null,
            poiCount: getAllPOIs().length,
            visitedCount: this.mapInstance ? this.mapInstance.visitedPOIs.size : 0
        };
    }

    // 导出访问数据（用于统计）
    exportVisitData() {
        if (!this.mapInstance) return null;
        
        const visitedPOIs = Array.from(this.mapInstance.visitedPOIs);
        const visitedDetails = visitedPOIs.map(id => getPOIById(id));
        
        return {
            totalPOIs: getAllPOIs().length,
            visitedCount: visitedPOIs.length,
            visitedPOIs: visitedDetails,
            progress: calculateProgress(visitedPOIs),
            exportTime: new Date().toISOString()
        };
    }

    // 重置应用状态
    reset() {
        if (this.mapInstance) {
            this.mapInstance.visitedPOIs.clear();
            this.mapInstance.updateProgress();
        }
        
        // 清除所有访问标记
        document.querySelectorAll('.custom-marker').forEach(marker => {
            marker.classList.remove('visited');
        });
        
        // 重置POI列表选中状态
        document.querySelectorAll('.poi-item').forEach(item => {
            item.classList.remove('active');
        });
        
        console.log('应用状态已重置');
    }

    // 销毁应用
    destroy() {
        if (this.mapInstance) {
            this.mapInstance.destroy();
        }
        
        // 清理事件监听器
        // 注意：在实际项目中，你可能需要更详细的清理逻辑
        
        this.isInitialized = false;
        console.log('应用已销毁');
    }
}

// 创建全局应用实例
let app;

// 应用启动函数
function startApp() {
    if (app) {
        console.warn('应用已经启动');
        return;
    }
    
    app = new G318StoryMap();
    app.initialize();
    
    // 暴露到全局作用域供调试使用
    window.g318App = app;
}

// 自动启动应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

// 导出给其他模块使用
window.G318StoryMap = G318StoryMap; 