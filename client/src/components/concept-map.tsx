import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Edit2, Save, Brain, PenTool } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Node {
  id: string;
  label: string;
  x?: number;
  y?: number;
  color?: string;
}

interface Link {
  source: string;
  target: string;
  label: string;
}

interface MapData {
  nodes: Node[];
  links: Link[];
}

interface ConceptMapProps {
  topic: string;
}

export default function ConceptMap({ topic }: ConceptMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [draggedNode, setDraggedNode] = useState<Node | null>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isAIMode, setIsAIMode] = useState(true);

  const colors = [
    "#2563eb", // blue
    "#16a34a", // green
    "#dc2626", // red
    "#9333ea", // purple
    "#ea580c", // orange
  ];

  const createEmptyMap = () => {
    setData({
      nodes: [{ id: "main", label: topic, x: 400, y: 300 }],
      links: []
    });
    setIsAIMode(false);
  };

  const generateAIMap = async () => {
    try {
      setIsAIMode(true);
      const response = await fetch("/api/generate-map", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ topic })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const mapData = await response.json();
      if (mapData && mapData.nodes) {
        mapData.nodes = mapData.nodes.map((node: Node) => ({
          ...node,
          x: node.x || Math.random() * 800,
          y: node.y || Math.random() * 600
        }));
        setData(mapData);
      }
    } catch (error) {
      console.error("Error generating map:", error);
      createEmptyMap(); // Fallback to empty map on error
    }
  };

  const drawNode = (ctx: CanvasRenderingContext2D, node: Node, isSelected: boolean = false) => {
    if (!node.x || !node.y) return;

    const scaledX = node.x * scale + offset.x;
    const scaledY = node.y * scale + offset.y;

    ctx.font = isSelected ? 'bold 14px Arial' : '13px Arial';
    const textMetrics = ctx.measureText(node.label);
    const padding = 10;
    const boxWidth = textMetrics.width + padding * 2;
    const boxHeight = 30;

    // Draw box
    ctx.fillStyle = node.color || colors[0];
    ctx.strokeStyle = isSelected ? '#000' : node.color || colors[0];
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(scaledX - boxWidth/2, scaledY - boxHeight/2, boxWidth, boxHeight, 5);
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, scaledX, scaledY);
  };

  const drawLink = (ctx: CanvasRenderingContext2D, source: Node, target: Node, label: string) => {
    if (!source.x || !source.y || !target.x || !target.y) return;

    const sourceX = source.x * scale + offset.x;
    const sourceY = source.y * scale + offset.y;
    const targetX = target.x * scale + offset.x;
    const targetY = target.y * scale + offset.y;

    // Draw arrow
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    ctx.lineTo(targetX, targetY);
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();

    // Draw label
    ctx.font = '11px Arial';
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText(label, midX, midY - 5);
  };

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw links
    data.links.forEach(link => {
      const sourceNode = data.nodes.find(n => n.id === link.source);
      const targetNode = data.nodes.find(n => n.id === link.target);
      if (sourceNode && targetNode) {
        drawLink(ctx, sourceNode, targetNode, link.label);
      }
    });

    // Draw nodes
    data.nodes.forEach(node => {
      drawNode(ctx, node, selectedNode?.id === node.id);
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale - offset.x;
    const y = (e.clientY - rect.top) / scale - offset.y;

    const clickedNode = data.nodes.find(node => {
      if (!node.x || !node.y) return false;
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      setDraggedNode(clickedNode);
      setEditLabel(clickedNode.label);
      setEditDetails(clickedNode.details || "");
    } else {
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedNode || !data) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale - offset.x;
    const y = (e.clientY - rect.top) / scale - offset.y;

    const updatedNodes = data.nodes.map(node =>
      node.id === draggedNode.id ? { ...node, x, y } : node
    );

    setData({ ...data, nodes: updatedNodes });
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(scale => Math.min(Math.max(scale * delta, 0.5), 2));
  };

  const addNewNode = () => {
    if (!data) return;

    const newNode: Node = {
      id: `node${data.nodes.length + 1}`,
      label: "Nuovo concetto",
      x: 200,
      y: 200,
      color: colors[data.nodes.length % colors.length],
    };

    const newLink: Link = {
      source: "main",
      target: newNode.id,
      label: "collegato a",
    };

    setData({
      nodes: [...data.nodes, newNode],
      links: [...data.links, newLink],
    });
  };

  const saveNodeChanges = () => {
    if (!selectedNode || !data) return;

    const updatedNodes = data.nodes.map(node =>
      node.id === selectedNode.id
        ? { ...node, label: editLabel, details: editDetails }
        : node
    );

    setData({ ...data, nodes: updatedNodes });
    setEditMode(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    if(isAIMode){
      generateAIMap();
    } else {
      createEmptyMap();
    }

  }, [topic, isAIMode]);

  useEffect(() => {
    if (data) {
      drawMap();
    }
  }, [data, selectedNode, scale, offset]);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Mappa Concettuale
          <div className="flex gap-2">
            <Button onClick={generateAIMap} size="sm" variant={isAIMode ? "default" : "outline"}>
              <Brain className="h-4 w-4 mr-1" />
              AI Map
            </Button>
            <Button onClick={createEmptyMap} size="sm" variant={!isAIMode ? "default" : "outline"}>
              <PenTool className="h-4 w-4 mr-1" />
              Manual Map
            </Button>
            {selectedNode && !editMode && (
              <Button onClick={() => setEditMode(true)} size="sm" variant="outline">
                <Edit2 className="h-4 w-4 mr-1" />
                Modifica
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          className="w-full h-[500px] border rounded-lg bg-card cursor-grab"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        {selectedNode && editMode && (
          <div className="mt-4 space-y-4 p-4 bg-muted rounded-lg">
            <div>
              <label className="text-sm font-medium">Etichetta</label>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dettagli</label>
              <Input
                value={editDetails}
                onChange={(e) => setEditDetails(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={saveNodeChanges}>
              <Save className="h-4 w-4 mr-1" />
              Salva Modifiche
            </Button>
          </div>
        )}
        {selectedNode && !editMode && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-bold">{selectedNode.label}</h3>
            {selectedNode.details && (
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedNode.details}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}