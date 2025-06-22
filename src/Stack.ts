// export namespace io.github.yumika {
  export class Stack<T> {

    private elements: T[] = [];

    push(element: T): void {
      this.elements.push(element);
    }

    pop(): T | undefined {
      return this.elements.pop();
    }

    peek(): T | undefined {
      return this.elements[this.elements.length - 1];
    }

    get(index: number): T | undefined {
      return this.elements[index];
    }

    isEmpty(): boolean {
      return this.elements.length === 0;
    }

    size(): number {
      return this.elements.length;
    }
  }
// }